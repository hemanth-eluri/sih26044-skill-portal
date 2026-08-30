/**
 * ISOTOPES - Main JavaScript File
 * Handles authentication, navigation, and API calls
 */

const API_BASE_URL = 'http://localhost:5000/api';

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function getApiErrorMessage(error, fallback) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return 'Cannot reach the backend. Start MongoDB, then run the backend on port 5000.';
    }
    return error.message || fallback;
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Check if user is logged in
 */
function isUserLoggedIn() {
    return localStorage.getItem('authToken') !== null;
}

/**
 * Get current user info
 */
function getCurrentUser() {
    return {
        userId: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole'),
        name: localStorage.getItem('userName') || 'User'
    };
}

/**
 * Get auth token
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Get authorization headers
 */
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Logout user
 */
function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}

// ============================================
// Form Validation Functions
// ============================================

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isStrongPassword(password) {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
}

/**
 * Validate form inputs
 */
function validateLoginForm(email, password) {
    if (!email || !password) {
        showAlert('Please fill in all fields', 'warning');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'warning');
        return false;
    }
    
    return true;
}

/**
 * Validate registration form
 */
function validateRegisterForm(name, email, password, confirmPassword, role) {
    if (!name || !email || !password || !confirmPassword || !role) {
        showAlert('Please fill in all fields', 'warning');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'warning');
        return false;
    }
    
    if (!isStrongPassword(password)) {
        showAlert('Password must be at least 8 characters with uppercase, lowercase, and numbers', 'warning');
        return false;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'warning');
        return false;
    }
    
    return true;
}

// ============================================
// Alert/Toast Functions
// ============================================

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.appendChild(alertDiv);
    }
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Show success notification
 */
function showSuccess(message) {
    showAlert(message, 'success');
}

/**
 * Show error notification
 */
function showError(message) {
    showAlert(message, 'danger');
}

/**
 * Show warning notification
 */
function showWarning(message) {
    showAlert(message, 'warning');
}

// ============================================
// API Functions - Authentication
// ============================================

/**
 * Register user
 */
async function registerUser(name, email, password, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword: password, role })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);

        return { success: true, message: data.message };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: getApiErrorMessage(error, 'Registration failed') };
    }
}

/**
 * Login user
 */
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);

        return { success: true, message: data.message };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: getApiErrorMessage(error, 'Login failed') };
    }
}

/**
 * Get current user info from backend
 */
async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch user');
        }

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Fetch user error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// API Functions - Student Profile
// ============================================

/**
 * Fetch student profile
 */
async function fetchStudentProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/me`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch profile');
        }

        return { success: true, student: data.student, user: data.user };
    } catch (error) {
        console.error('Fetch profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update student profile
 */
async function updateStudentProfile(profileData) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/me/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(profileData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        return { success: true, student: data.student, user: data.user };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add education
 */
async function addEducation(educationData) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/education`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(educationData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add education');
        }

        return { success: true, student: data.student };
    } catch (error) {
        console.error('Add education error:', error);
        return { success: false, error: error.message };
    }
}

async function studentProfileRequest(path, method, payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${path}`, {
            method,
            headers: getAuthHeaders(),
            body: payload ? JSON.stringify(payload) : undefined
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to save profile information');
        return { success: true, student: data.student };
    } catch (error) {
        console.error('Student profile request error:', error);
        return { success: false, error: getApiErrorMessage(error, 'Unable to save profile information') };
    }
}

const addExperience = (data) => studentProfileRequest('experience', 'POST', data);
const addCertification = (data) => studentProfileRequest('certifications', 'POST', data);
const deleteEducation = (id) => studentProfileRequest(`education/${id}`, 'DELETE');
const deleteExperience = (id) => studentProfileRequest(`experience/${id}`, 'DELETE');
const deleteProject = (id) => studentProfileRequest(`projects/${id}`, 'DELETE');
const deleteCertification = (id) => studentProfileRequest(`certifications/${id}`, 'DELETE');

/**
 * Add project
 */
async function addProject(projectData) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/projects`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(projectData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add project');
        }

        return { success: true, student: data.student };
    } catch (error) {
        console.error('Add project error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add skill
 */
async function addSkill(name, level = 'beginner') {
    try {
        const response = await fetch(`${API_BASE_URL}/students/skills`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, level })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add skill');
        }

        return { success: true, student: data.student };
    } catch (error) {
        console.error('Add skill error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// API Functions - Assessments
// ============================================

/**
 * Fetch all assessments
 */
async function fetchAssessments() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch assessments');
        }

        return { success: true, assessments: data.assessments };
    } catch (error) {
        console.error('Fetch assessments error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch specific assessment
 */
async function fetchAssessment(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch assessment');
        }

        return { success: true, assessment: data.assessment };
    } catch (error) {
        console.error('Fetch assessment error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submit assessment
 */
async function submitAssessment(assessmentId, answers, timeSpent) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ answers, timeSpent })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit assessment');
        }

        return { success: true, result: data.result };
    } catch (error) {
        console.error('Submit assessment error:', error);
        return { success: false, error: error.message };
    }
}

async function generateAssessment(skills) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ skills })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Assessment generation failed');
        return { success: true, assessment: data.assessment };
    } catch (error) {
        console.error('Generate assessment error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchMyAssessmentResults() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/results/me`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch assessment results');
        return { success: true, results: data.results };
    } catch (error) {
        console.error('Fetch assessment results error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchSkillCatalog() {
    try {
        const response = await fetch(`${API_BASE_URL}/skills`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch skill catalog');
        return { success: true, skills: data.skills || [] };
    } catch (error) {
        console.error('Fetch skill catalog error:', error);
        return { success: false, error: error.message };
    }
}

async function createAssessmentSession(mode, skills = [], questionCount = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/session`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ mode, skills, questionCount })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to start assessment');
        return { success: true, session: data.session };
    } catch (error) {
        console.error('Create assessment session error:', error);
        return { success: false, error: error.message };
    }
}

async function submitAssessmentSession(sessionId, answers) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/session/${sessionId}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ answers })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit assessment');
        return { success: true, result: data.result };
    } catch (error) {
        console.error('Submit assessment session error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchAssessmentHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/history`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch assessment history');
        return { success: true, results: data.results || [] };
    } catch (error) {
        console.error('Fetch assessment history error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchSkillAnalysis() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/me/skill-analysis`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch skill analysis');
        return { success: true, analysis: data.analysis };
    } catch (error) {
        console.error('Fetch skill analysis error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchSkillPassport() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/me/skill-passport`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load skill passport');
        return { success: true, passport: data.passport };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchRecommendedHackathons(params = {}) {
    try {
        const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined));
        const response = await fetch(`${API_BASE_URL}/hackathons/recommended?${query}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch hackathons');
        return { success: true, recommendations: data.recommendations || [], pagination: data.pagination };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchHackathon(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathons/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch hackathon');
        return { success: true, hackathon: data.hackathon };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateHackathonActivity(id, status) {
    try {
        const isSave = status === 'saved';
        const response = await fetch(`${API_BASE_URL}/hackathons/${id}/${isSave ? 'save' : 'status'}`, {
            method: 'POST', headers: getAuthHeaders(), body: isSave ? undefined : JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update hackathon');
        return { success: true, activity: data.activity, selfReported: data.selfReported };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function removeSavedHackathon(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathons/${id}/save`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to remove saved hackathon');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchMyHackathons(status = '') {
    try {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        const response = await fetch(`${API_BASE_URL}/students/me/hackathons${query}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch saved hackathons');
        return { success: true, activities: data.activities || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchHackathonParticipations() {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathon-participations`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch hackathon participations');
        return { success: true, count: data.count || 0, participations: data.participations || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createHackathonParticipation(participation) {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathon-participations`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(participation)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to add hackathon participation');
        return { success: true, participation: data.participation };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateHackathonParticipation(id, participation) {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathon-participations/${id}`, {
            method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(participation)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update hackathon participation');
        return { success: true, participation: data.participation };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteHackathonParticipation(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/hackathon-participations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete hackathon participation');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// API Functions - Career Roles
// ============================================

/**
 * Fetch all career roles
 */
async function fetchCareerRoles() {
    try {
        const response = await fetch(`${API_BASE_URL}/career-roles`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch career roles');
        }

        return { success: true, roles: data.roles };
    } catch (error) {
        console.error('Fetch career roles error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch specific career role
 */
async function fetchCareerRole(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/career-roles/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch career role');
        }

        return { success: true, role: data.role };
    } catch (error) {
        console.error('Fetch career role error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Select target career role
 */
async function selectCareerRole(roleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/career-roles/select/${roleId}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to select career role');
        }

        return { success: true, student: data.student };
    } catch (error) {
        console.error('Select career role error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate skill gap
 */
function calculateSkillGap(studentSkills, roleRequiredSkills) {
    const studentSkillNames = studentSkills.map(s => s.name.toLowerCase());

    if (roleRequiredSkills.length === 0) {
        return { matchPercentage: 100, matched: [], missing: [], strong: [], weak: [] };
    }
    
    const matched = [];
    const missing = [];
    const strong = [];
    const weak = [];

    roleRequiredSkills.forEach(roleSkill => {
        const studentSkill = studentSkills.find(
            s => s.name.toLowerCase() === roleSkill.name.toLowerCase()
        );

        if (studentSkill) {
            matched.push({
                name: roleSkill.name,
                studentLevel: studentSkill.level,
                requiredLevel: roleSkill.level,
                importance: roleSkill.importance
            });

            if (roleSkill.importance === 'critical') {
                strong.push(roleSkill.name);
            }
        } else {
            missing.push({
                name: roleSkill.name,
                requiredLevel: roleSkill.level,
                importance: roleSkill.importance,
                alternatives: roleSkill.alternatives
            });

            if (roleSkill.importance === 'critical') {
                weak.push(roleSkill.name);
            }
        }
    });

    return {
        matchPercentage: Math.round((matched.length / roleRequiredSkills.length) * 100),
        matched,
        missing,
        strong,
        weak
    };
}

// ============================================
// API Functions - Opportunities
// ============================================

/**
 * Fetch opportunities
 */
async function fetchOpportunities(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `${API_BASE_URL}/opportunities?${queryParams}` : `${API_BASE_URL}/opportunities`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch opportunities');
        }

        return { success: true, opportunities: data.opportunities };
    } catch (error) {
        console.error('Fetch opportunities error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch specific opportunity
 */
async function fetchOpportunity(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/opportunities/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch opportunity');
        }

        return { success: true, opportunity: data.opportunity };
    } catch (error) {
        console.error('Fetch opportunity error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create opportunity (industry only)
 */
async function createOpportunity(opportunityData) {
    try {
        const response = await fetch(`${API_BASE_URL}/opportunities`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(opportunityData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create opportunity');
        }

        return { success: true, opportunity: data.opportunity };
    } catch (error) {
        console.error('Create opportunity error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// API Functions - Applications
// ============================================

/**
 * Apply for opportunity
 */
async function applyForOpportunity(opportunityId, coverLetter = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ opportunityId, coverLetter })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to apply');
        }

        return { success: true, application: data.application };
    } catch (error) {
        console.error('Apply error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch student's applications
 */
async function fetchStudentApplications() {
    try {
        const response = await fetch(`${API_BASE_URL}/applications/student`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch applications');
        }

        return { success: true, applications: data.applications };
    } catch (error) {
        console.error('Fetch applications error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DOM Ready Functions
// ============================================

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeAppShell();
    // Check if user needs to be redirected to login
    checkAuthStatus();
    
    // Initialize tooltips and popovers
    initializeBootstrapComponents();
    
    // Setup event listeners
    setupEventListeners();
});

function initializeAppShell() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['student-dashboard.html', 'student-profile.html', 'skill-assessment.html', 'skill-display.html', 'skill-gap-analysis.html', 'career-roadmap.html', 'opportunities.html', 'applications.html', 'hackathons.html', 'jobs-for-me.html', 'company-insights.html', 'industry-dashboard.html'];
    if (!protectedPages.includes(page)) return;
    const nav = document.querySelector('body > nav.navbar');
    if (!nav) return;
    const isIndustry = page === 'industry-dashboard.html';
    const studentGroups = [
        ['Overview', [['student-dashboard.html', 'Dashboard', 'fa-house']]],
        ['Development', [['student-profile.html', 'Profile', 'fa-user'], ['skill-assessment.html', 'Assessment', 'fa-clipboard-check'], ['skill-display.html', 'Skill Passport', 'fa-fingerprint'], ['skill-gap-analysis.html', 'Skill Gap', 'fa-chart-line'], ['career-roadmap.html', 'Career Roadmap', 'fa-route']]],
        ['Opportunities', [['jobs-for-me.html', 'Jobs for Me', 'fa-briefcase'], ['opportunities.html', 'Employer Opportunities', 'fa-building'], ['hackathons.html', 'Hackathons', 'fa-trophy'], ['applications.html', 'Applications', 'fa-folder-open']]],
        ['Insights', [['company-insights.html', 'Target Company', 'fa-bullseye']]]
    ];
    const groups = isIndustry ? [['Overview', [['industry-dashboard.html', 'Industry Dashboard', 'fa-building']]]] : studentGroups;
    const links = groups.map(([label, items]) => `<div class="app-nav-group"><div class="app-nav-label">${label}</div>${items.map(([href, text, icon]) => `<a class="app-nav-link ${page === href ? 'active' : ''}" href="${href}"><i class="fas ${icon}" aria-hidden="true"></i><span>${text}</span></a>`).join('')}</div>`).join('');
    nav.className = 'app-sidebar';
    nav.innerHTML = `<a class="app-brand" href="${isIndustry ? 'industry-dashboard.html' : 'student-dashboard.html'}"><span class="app-brand-mark">I</span><span><strong>ISOTOPES</strong><small>Career Intelligence</small></span></a><div class="app-nav">${links}</div><button class="app-nav-link app-logout" data-action="logout"><i class="fas fa-arrow-right-from-bracket"></i><span>Logout</span></button>`;
    const header = document.createElement('header');
    header.className = 'app-header';
    const active = groups.flatMap(group => group[1]).find(item => item[0] === page);
    header.innerHTML = `<button class="app-menu-button" type="button" aria-label="Open navigation"><i class="fas fa-bars"></i></button><div><div class="app-header-eyebrow">ISOTOPES</div><strong>${active ? active[1] : 'Workspace'}</strong></div><a class="app-profile-link" href="${isIndustry ? 'industry-dashboard.html' : 'student-profile.html'}" aria-label="Open profile"><i class="fas fa-circle-user"></i></a>`;
    document.body.insertBefore(header, nav.nextSibling);
    document.body.classList.add('has-app-shell');
    header.querySelector('.app-menu-button').addEventListener('click', () => document.body.classList.toggle('app-nav-open'));
    document.addEventListener('click', event => { if (document.body.classList.contains('app-nav-open') && !event.target.closest('.app-sidebar') && !event.target.closest('.app-menu-button')) document.body.classList.remove('app-nav-open'); });
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    const protectedPages = ['student-dashboard.html', 'student-profile.html', 'skill-assessment.html', 'skill-display.html', 'skill-gap-analysis.html', 'career-roadmap.html', 'opportunities.html', 'applications.html', 'hackathons.html', 'jobs-for-me.html', 'company-insights.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !isUserLoggedIn()) {
        window.location.href = 'login.html';
    }
}

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Add event listeners for dynamic content
    document.addEventListener('click', function(e) {
        // Handle logout buttons
        if (e.target.closest('[data-action="logout"]')) {
            logoutUser();
        }
    });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format date
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Truncate text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ============================================
// Local Storage Functions
// ============================================

/**
 * Save data to local storage
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

/**
 * Get data from local storage
 */
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
    }
}

/**
 * Remove data from local storage
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from storage:', error);
        return false;
    }
}

// ============================================
// Export functions for external use
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isUserLoggedIn,
        getCurrentUser,
        logoutUser,
        validateLoginForm,
        validateRegisterForm,
        showAlert,
        showSuccess,
        showError,
        loginUser,
        registerUser,
        fetchStudentProfile,
        updateStudentProfile,
        addEducation,
        addExperience,
        addProject,
        addCertification,
        generateAssessment,
        fetchMyAssessmentResults,
        deleteEducation,
        deleteExperience,
        deleteProject,
        deleteCertification,
        fetchUserSkills
    };
}
