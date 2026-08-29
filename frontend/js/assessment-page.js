let currentQuestion = 0;
let assessmentSession = null;
let answers = [];
let assessmentProfile = null;

function assessmentMode() {
    return document.querySelector('input[name="assessmentMode"]:checked').value;
}

function visibleSkillChoices() {
    return [...document.querySelectorAll(assessmentMode() === 'custom' ? '.custom-choice' : '.profile-choice')];
}

function updateAssessmentStartButton() {
    const role = assessmentProfile?.student?.targetRole || assessmentProfile?.student?.primaryTargetRole;
    document.getElementById('generateAssessmentButton').disabled = assessmentMode() === 'target-role'
        ? !role
        : !visibleSkillChoices().some(input => input.checked);
}

function showAssessmentMode() {
    const mode = assessmentMode();
    document.getElementById('profileSkills').hidden = mode !== 'profile-skills';
    document.getElementById('targetRoleSummary').hidden = mode !== 'target-role';
    document.getElementById('customSkills').hidden = mode !== 'custom';
    document.getElementById('selectAllSkillsButton').hidden = mode === 'target-role' || !visibleSkillChoices().length;
    updateAssessmentStartButton();
}

function selectAllSkills() {
    visibleSkillChoices().forEach(input => { input.checked = true; });
    updateAssessmentStartButton();
}

async function loadAssessmentHistory() {
    const result = await fetchAssessmentHistory();
    const history = document.getElementById('assessmentHistory');
    if (!result.success) {
        history.innerHTML = `<tr><td colspan="5" class="text-danger">${escapeHtml(result.error)}</td></tr>`;
        return;
    }
    history.innerHTML = result.results.length ? result.results.map(item => `
        <tr>
            <td>${escapeHtml(item.mode === 'legacy' ? item.assessmentId?.title || 'Assessment' : item.mode || 'Assessment')}</td>
            <td>${item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Not available'}</td>
            <td><strong>${item.score}%</strong></td>
            <td><span class="badge bg-success">Scored</span></td>
            <td>${escapeHtml((item.skillScores || []).map(score => `${score.skill}: ${score.score}%`).join(', '))}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="text-muted">No completed assessments yet.</td></tr>';
}

async function loadAssessmentPage() {
    if (!isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    const [profileResult, catalogResult] = await Promise.all([fetchStudentProfile(), fetchSkillCatalog()]);
    if (!profileResult.success) {
        showError(profileResult.error || 'Unable to load your profile');
        return;
    }
    assessmentProfile = profileResult;
    const profileSkills = profileResult.student.skills || [];
    document.getElementById('profileSkills').innerHTML = profileSkills.length ? profileSkills.map((skill, index) => `
        <div class="col-md-4"><label class="form-check"><input class="form-check-input skill-choice profile-choice" type="checkbox" value="${escapeHtml(skill.name)}" id="profile-skill-${index}"><span class="form-check-label">${escapeHtml(skill.name)} — ${escapeHtml(skill.selfDeclaredLevel || 'beginner')} <small class="text-muted">(self declared)</small></span></label></div>`).join('')
        : '<p class="text-muted">Add skills to your profile before starting a profile-skills assessment. <a href="student-profile.html">Add Skills to Profile</a></p>';
    const role = profileResult.student.targetRole || profileResult.student.primaryTargetRole;
    document.getElementById('targetRoleSummary').innerHTML = role
        ? `<strong>${escapeHtml(role.title)}</strong><br><span class="text-muted">${escapeHtml((role.requiredSkills || []).map(skill => skill.name).join(', ') || 'No required skills configured.')}</span>`
        : 'Select a target career role in your profile before using this mode.';
    document.getElementById('customSkills').innerHTML = catalogResult.success && catalogResult.skills.length
        ? catalogResult.skills.map((skill, index) => `<div class="col-md-4"><label class="form-check"><input class="form-check-input skill-choice custom-choice" type="checkbox" value="${escapeHtml(skill.name)}" id="custom-skill-${index}"><span class="form-check-label">${escapeHtml(skill.name)}</span></label></div>`).join('')
        : `<p class="text-muted">${escapeHtml(catalogResult.error || 'No verified assessment skills are available.')}</p>`;
    document.querySelectorAll('.skill-choice').forEach(input => input.addEventListener('change', updateAssessmentStartButton));
    document.querySelectorAll('.assessment-mode').forEach(input => input.addEventListener('change', showAssessmentMode));
    showAssessmentMode();
    await loadAssessmentHistory();
}

async function startSelectedAssessment() {
    const mode = assessmentMode();
    const skills = mode === 'target-role' ? [] : visibleSkillChoices().filter(input => input.checked).map(input => input.value);
    const message = document.getElementById('assessmentMessage');
    const button = document.getElementById('generateAssessmentButton');
    message.textContent = 'Loading verified questions...';
    button.disabled = true;
    const result = await createAssessmentSession(mode, skills);
    button.disabled = false;
    if (!result.success) {
        message.textContent = result.error || 'Assessment unavailable.';
        return;
    }
    message.textContent = '';
    assessmentSession = result.session;
    answers = Array(assessmentSession.questions.length).fill(null);
    currentQuestion = 0;
    document.querySelector('.card.border-0.shadow-sm.mb-5').style.display = 'none';
    document.getElementById('assessmentForm').style.display = 'block';
    document.getElementById('assessmentTitle').textContent = `${assessmentSession.mode}: ${assessmentSession.selectedSkills.join(', ')}`;
    renderQuestion();
}

function cancelAssessment() {
    document.querySelector('.card.border-0.shadow-sm.mb-5').style.display = 'block';
    document.getElementById('assessmentForm').style.display = 'none';
}

function renderQuestion() {
    const question = assessmentSession.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / assessmentSession.questions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('currentQuestion').textContent = currentQuestion + 1;
    document.getElementById('totalQuestions').textContent = assessmentSession.questions.length;
    document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
    document.getElementById('prevBtn').style.display = currentQuestion === 0 ? 'none' : 'block';
    document.getElementById('nextBtn').textContent = currentQuestion === assessmentSession.questions.length - 1 ? 'Submit Assessment' : 'Next';
    document.getElementById('questionText').textContent = `${question.skill} · ${question.difficulty.toUpperCase()} — ${question.questionText}`;
    document.getElementById('optionsContainer').innerHTML = question.options.map((option, index) => `
        <div class="form-check mb-3"><input class="form-check-input" type="radio" name="answer" value="${index}" id="option-${index}" ${answers[currentQuestion] === index ? 'checked' : ''}><label class="form-check-label" for="option-${index}">${escapeHtml(option)}</label></div>`).join('');
}

function nextQuestion() {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) {
        showError('Select an answer before continuing');
        return;
    }
    answers[currentQuestion] = Number(selected.value);
    if (currentQuestion < assessmentSession.questions.length - 1) {
        currentQuestion += 1;
        renderQuestion();
    } else {
        submitCurrentAssessment();
    }
}

function previousQuestion() {
    if (currentQuestion === 0) return;
    const selected = document.querySelector('input[name="answer"]:checked');
    if (selected) answers[currentQuestion] = Number(selected.value);
    currentQuestion -= 1;
    renderQuestion();
}

async function submitCurrentAssessment() {
    const button = document.getElementById('nextBtn');
    button.disabled = true;
    button.textContent = 'Scoring...';
    const payload = answers.map((selectedIndex, index) => ({
        questionId: assessmentSession.questions[index].id,
        selectedAnswer: assessmentSession.questions[index].options[selectedIndex]
    }));
    const result = await submitAssessmentSession(assessmentSession.id, payload);
    button.disabled = false;
    if (!result.success) {
        button.textContent = 'Submit Assessment';
        showError(result.error || 'Assessment submission failed');
        return;
    }
    const scored = result.result;
    document.getElementById('assessmentResult').hidden = false;
    document.getElementById('resultContent').innerHTML = `
        <div class="display-5 fw-bold text-primary">${scored.score}%</div>
        <p>${scored.correctAnswers} correct out of ${scored.totalQuestions}. This is assessment evidence, not a permanent label.</p>
        <div class="row g-3">${scored.skillScores.map(skill => `<div class="col-md-4"><div class="border rounded p-3"><strong>${escapeHtml(skill.skill)}</strong><div>${skill.score}% · ${escapeHtml(skill.level)}</div></div></div>`).join('')}</div>
        <h6 class="mt-4">Topic performance</h6><ul>${scored.topicScores.map(topic => `<li>${escapeHtml(topic.topic)}: ${topic.score}%</li>`).join('')}</ul>`;
    showSuccess(`Assessment scored ${scored.score}% and was saved.`);
    cancelAssessment();
    await loadAssessmentHistory();
}

function logout() {
    logoutUser();
}

loadAssessmentPage();
