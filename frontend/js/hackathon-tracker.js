let hackathonParticipations = [];

function trackerDateText(value) {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderParticipationTracker() {
    document.getElementById('totalHackathonsAttended').textContent = hackathonParticipations.length;
    const state = document.getElementById('participationState');
    const timeline = document.getElementById('participationTimeline');
    if (!hackathonParticipations.length) {
        state.hidden = false;
        state.className = 'alert alert-light border';
        state.textContent = 'No hackathon participations recorded yet. Add your first attended hackathon.';
        timeline.innerHTML = '';
        return;
    }
    state.hidden = true;
    timeline.innerHTML = hackathonParticipations.map(participation => `
      <div class="col-lg-6"><article class="card border-0 shadow-sm h-100 participation-card"><div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-start gap-3"><div><div class="text-primary small fw-semibold">${escapeHtml(trackerDateText(participation.date))}</div><h5 class="mb-1">${escapeHtml(participation.hackathonName)}</h5><div class="text-muted">${escapeHtml(participation.role)}</div></div><span class="badge bg-success">${escapeHtml(participation.outcome)}</span></div>
        <hr><div class="mb-2"><strong>Project:</strong> ${escapeHtml(participation.projectName)}</div>
        <div>${(participation.techStackUsed || []).map(technology => `<span class="badge bg-light text-dark border me-1 mb-1">${escapeHtml(technology)}</span>`).join('') || '<span class="text-muted small">No technology stack recorded.</span>'}</div>
        <button class="btn btn-sm btn-outline-danger mt-3" data-delete-participation="${participation.id}"><i class="fas fa-trash me-1"></i> Delete</button>
      </div></article></div>`).join('');
}

async function loadParticipationTracker() {
    const state = document.getElementById('participationState');
    state.hidden = false;
    state.className = 'alert alert-light border';
    state.textContent = 'Loading your participation history...';
    const result = await fetchHackathonParticipations();
    if (!result.success) {
        state.className = 'alert alert-danger';
        state.textContent = `Unable to load participation history: ${result.error}`;
        return;
    }
    hackathonParticipations = result.participations;
    renderParticipationTracker();
}

document.getElementById('participationDate').max = new Date().toISOString().slice(0, 10);
document.getElementById('participationForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
        event.currentTarget.reportValidity();
        return;
    }
    const button = document.getElementById('saveParticipationButton');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    formData.techStackUsed = formData.techStackUsed.split(',').map(item => item.trim()).filter(Boolean);
    button.disabled = true;
    button.textContent = 'Saving...';
    const result = await createHackathonParticipation(formData);
    button.disabled = false;
    button.textContent = 'Save Participation';
    if (!result.success) return showError(result.error);

    hackathonParticipations = [result.participation, ...hackathonParticipations];
    renderParticipationTracker();
    event.currentTarget.reset();
    document.getElementById('participationDate').max = new Date().toISOString().slice(0, 10);
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('participationFormPanel')).hide();
    showSuccess('Hackathon participation saved. Your tracker was updated.');
});

document.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete-participation]');
    if (!button || !confirm('Delete this hackathon participation?')) return;
    button.disabled = true;
    const result = await deleteHackathonParticipation(button.dataset.deleteParticipation);
    if (!result.success) {
        button.disabled = false;
        return showError(result.error);
    }
    hackathonParticipations = hackathonParticipations.filter(item => String(item.id) !== button.dataset.deleteParticipation);
    renderParticipationTracker();
    showSuccess('Hackathon participation deleted.');
});

loadParticipationTracker();
