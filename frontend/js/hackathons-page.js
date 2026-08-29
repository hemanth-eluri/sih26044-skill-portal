let hackathonPage = 1;
let hackathonPagination = null;

const dateText = value => value ? new Date(value).toLocaleDateString() : 'Not specified by source';
const labelText = value => value ? String(value).replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase()) : 'Unknown';
const safeOfficialUrl = value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
};

function filterValues() {
    const values = Object.fromEntries(new FormData(document.getElementById('filterForm')).entries());
    values.page = hackathonPage;
    values.limit = 12;
    return values;
}

function deadlineText(value) {
    if (!value) return 'Deadline not provided by source';
    const deadline = new Date(value);
    const days = Math.ceil((deadline - new Date()) / 86400000);
    if (days < 0) return 'Registration closed';
    return `Registration closes in ${days} day${days === 1 ? '' : 's'}`;
}

function hackathonCard(item) {
    const recommendation = item.recommendation || {};
    const officialUrl = safeOfficialUrl(item.registrationUrl);
    return `<div class="col-lg-4 col-md-6"><article class="card h-100 border-0 shadow-sm"><div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between gap-2"><span class="badge bg-info text-dark">${escapeHtml(labelText(item.mode))}</span><span class="badge bg-primary">${recommendation.matchScore || 0}% relevance</span></div>
      <h5 class="mt-3">${escapeHtml(item.title)}</h5><p class="text-muted small mb-2">${escapeHtml(item.organizer || 'Organizer not specified by source')}</p>
      <div class="mb-2">${(item.domains || []).map(domain => `<span class="badge bg-light text-dark border me-1">${escapeHtml(domain)}</span>`).join('')}</div>
      <p class="small mb-1"><strong>Starts:</strong> ${escapeHtml(dateText(item.startDate))}</p><p class="small mb-2"><strong>${escapeHtml(deadlineText(item.registrationDeadline))}</strong></p>
      <ul class="small text-muted ps-3">${(recommendation.matchedReasons || []).slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join('') || '<li>Complete your profile for more specific reasons.</li>'}</ul>
      <p class="small text-muted mt-auto">Source: <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceName)}</a><br>Last checked: ${escapeHtml(dateText(item.lastFetchedAt))}</p>
      <div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-outline-primary" data-detail="${item._id}">View Details</button><button class="btn btn-sm btn-outline-secondary" data-activity="saved" data-id="${item._id}">${item.activityStatus === 'saved' ? 'Saved' : 'Save'}</button>${officialUrl ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener noreferrer">Register on Official Website</a>` : ''}</div>
    </div></article></div>`;
}

async function loadHackathons() {
    const state = document.getElementById('hackathonState');
    const grid = document.getElementById('hackathonGrid');
    state.hidden = false; state.className = 'alert alert-light border'; state.textContent = 'Loading hackathons...'; grid.innerHTML = '';
    const result = await fetchRecommendedHackathons(filterValues());
    if (!result.success) { state.className = 'alert alert-danger'; state.textContent = `Unable to load hackathons: ${result.error}`; return; }
    hackathonPagination = result.pagination;
    if (!result.recommendations.length) { state.textContent = 'No current hackathons available for these filters.'; }
    else { state.hidden = true; grid.innerHTML = result.recommendations.map(hackathonCard).join(''); }
    document.getElementById('pageLabel').textContent = `Page ${result.pagination.page} of ${Math.max(1, result.pagination.pages)}`;
    document.getElementById('previousPage').disabled = result.pagination.page <= 1;
    document.getElementById('nextPage').disabled = result.pagination.page >= result.pagination.pages;
}

async function showHackathonDetails(id) {
    const result = await fetchHackathon(id);
    if (!result.success) return showError(result.error);
    const item = result.hackathon;
    document.getElementById('detailTitle').textContent = item.title;
    document.getElementById('detailBody').innerHTML = `<p>${escapeHtml(item.description || 'Not specified by source')}</p><dl class="row"><dt class="col-sm-4">Organizer</dt><dd class="col-sm-8">${escapeHtml(item.organizer || 'Not specified by source')}</dd><dt class="col-sm-4">Dates</dt><dd class="col-sm-8">${escapeHtml(dateText(item.startDate))} – ${escapeHtml(dateText(item.endDate))}</dd><dt class="col-sm-4">Registration deadline</dt><dd class="col-sm-8">${escapeHtml(dateText(item.registrationDeadline))}</dd><dt class="col-sm-4">Mode / location</dt><dd class="col-sm-8">${escapeHtml(labelText(item.mode))} · ${escapeHtml(item.location?.city || item.location?.country || item.location?.venue || 'Not specified by source')}</dd><dt class="col-sm-4">Eligibility</dt><dd class="col-sm-8">${escapeHtml([...(item.eligibility?.degrees || []), ...(item.eligibility?.branches || []), ...(item.eligibility?.otherRequirements || [])].join(', ') || 'Not specified by source')}</dd><dt class="col-sm-4">Team size</dt><dd class="col-sm-8">${item.teamSizeMin || item.teamSizeMax ? `${item.teamSizeMin || '?'}–${item.teamSizeMax || '?'}` : 'Not specified by source'}</dd><dt class="col-sm-4">Prize</dt><dd class="col-sm-8">${escapeHtml(item.prizeInformation || 'Not specified by source')}</dd><dt class="col-sm-4">Fee</dt><dd class="col-sm-8">${item.isFree === true ? 'Free' : item.isFree === false ? escapeHtml(item.registrationFee ?? 'Paid; amount not specified by source') : 'Not specified by source'}</dd><dt class="col-sm-4">Source</dt><dd class="col-sm-8"><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceName)}</a> · checked ${escapeHtml(dateText(item.lastFetchedAt))}</dd></dl>`;
    const url = safeOfficialUrl(item.registrationUrl);
    document.getElementById('detailFooter').innerHTML = `<button class="btn btn-outline-secondary" data-activity="saved" data-id="${item._id}">Save</button><button class="btn btn-outline-success" data-activity="registered-self-reported" data-id="${item._id}">I Registered (Self Reported)</button>${url ? `<a class="btn btn-primary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Register on Official Website</a>` : ''}`;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('hackathonModal')).show();
}

async function loadMyHackathons() {
    const section = document.getElementById('myHackathonsSection'); section.hidden = false;
    const status = document.getElementById('activityFilter').value;
    const result = await fetchMyHackathons(status);
    const state = document.getElementById('myHackathonsState'); const list = document.getElementById('myHackathonsList');
    if (!result.success) { state.textContent = `Unable to load My Hackathons: ${result.error}`; return; }
    state.textContent = result.activities.length ? '' : 'No hackathons in this section yet.';
    list.innerHTML = result.activities.map(activity => `<div class="col-md-6"><div class="card card-body"><div class="d-flex justify-content-between"><strong>${escapeHtml(activity.hackathonId?.title || 'Unavailable hackathon')}</strong><span class="badge bg-secondary">${escapeHtml(labelText(activity.status))}</span></div><small class="text-muted mt-2">${activity.status === 'registered-self-reported' ? 'Registration is self reported and not externally confirmed.' : ''}</small></div></div>`).join('');
    section.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('filterForm').addEventListener('submit', event => { event.preventDefault(); hackathonPage = 1; loadHackathons(); });
document.getElementById('clearFilters').addEventListener('click', () => { document.getElementById('filterForm').reset(); hackathonPage = 1; loadHackathons(); });
document.getElementById('previousPage').addEventListener('click', () => { if (hackathonPage > 1) { hackathonPage -= 1; loadHackathons(); } });
document.getElementById('nextPage').addEventListener('click', () => { if (hackathonPagination && hackathonPage < hackathonPagination.pages) { hackathonPage += 1; loadHackathons(); } });
document.getElementById('myHackathonsButton').addEventListener('click', loadMyHackathons);
document.getElementById('activityFilter').addEventListener('change', loadMyHackathons);
document.addEventListener('click', async event => {
    const detail = event.target.closest('[data-detail]'); if (detail) return showHackathonDetails(detail.dataset.detail);
    const activityButton = event.target.closest('[data-activity]'); if (!activityButton) return;
    const result = await updateHackathonActivity(activityButton.dataset.id, activityButton.dataset.activity);
    if (!result.success) return showError(result.error);
    showSuccess(activityButton.dataset.activity === 'registered-self-reported' ? 'Saved as Registered — Self Reported.' : 'Hackathon saved.');
    await Promise.all([loadHackathons(), document.getElementById('myHackathonsSection').hidden ? Promise.resolve() : loadMyHackathons()]);
});

loadHackathons();
