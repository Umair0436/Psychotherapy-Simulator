// Global variables
let currentPage = 1;
let sessionData = {
    profile: {},
    messages: [],
    startTime: null,
    endTime: null
};

// Sample patient profiles
const profileTemplates = {
    anxiety: {
        behavior: "restless, fidgety, avoids eye contact",
        tone: "rapid speech, worried, seeking reassurance"
    },
    depression: {
        behavior: "withdrawn, low energy, minimal responses",
        tone: "flat, monotone, hopeless"
    },
    trauma: {
        behavior: "hypervigilant, startled easily, guarded",
        tone: "cautious, defensive, emotional triggers"
    },
    social: {
        behavior: "shy, nervous, self-conscious",
        tone: "quiet, apologetic, self-deprecating"
    },
    panic: {
        behavior: "anxious, checking exits, physical symptoms",
        tone: "fearful, urgent, catastrophizing"
    },
    bipolar: {
        behavior: "mood swings, either energetic or lethargic",
        tone: "varies between elevated and depressed"
    }
};

// DOM Element references (Performance optimization)
const DOM = {
    ageInput: document.getElementById('age'),
    symptomsSelect: document.getElementById('symptoms'),
    behaviorInput: document.getElementById('behavior'),
    toneInput: document.getElementById('tone'),
    profileForm: document.getElementById('profile-form'),
    startButton: document.getElementById('start-session-btn'),
    formStatus: document.getElementById('form-status'),
    markdownSection: document.getElementById('markdown-section'),
    markdownButtons: document.querySelectorAll('.btn-tag'), // Class name updated from markdown-btn to btn-tag
    sendButton: document.getElementById('send-btn'),
    studentInput: document.getElementById('student-input'),
    endSessionButton: document.getElementById('end-session-btn'),
    newSessionButton: document.getElementById('new-session-btn'),
    downloadReportButton: document.getElementById('download-report-btn'),
    chatContainer: document.getElementById('chat-messages'),
    progressBarFill: document.querySelector('.progress-fill')
};


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateStartButton();
});

// ----------------------------------------------------------------
// 1. Event Listeners Setup
// ----------------------------------------------------------------
function setupEventListeners() {
    // Array of form input IDs to track for live validation/button status
    const formInputs = [DOM.ageInput, DOM.symptomsSelect, DOM.behaviorInput, DOM.toneInput];
    formInputs.forEach(element => {
        element.addEventListener('input', updateStartButton);
        element.addEventListener('change', updateStartButton);
    });

    // Symptoms dropdown logic: Show/Hide Quick Profile buttons
    DOM.symptomsSelect.addEventListener('change', () => {
        const action = DOM.symptomsSelect.value ? 'add' : 'remove';
        DOM.markdownSection.classList[action]('show');
    });

    // Quick Profile Buttons logic
    DOM.markdownButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const profile = profileTemplates[this.dataset.profile];
            if (profile) {
                // Apply profile
                DOM.behaviorInput.value = profile.behavior;
                DOM.toneInput.value = profile.tone;
                
                // Toggle active class (ensures only one is active)
                DOM.markdownButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                updateStartButton(); // Check validation status again
            }
        });
    });

    // Form submission handler (using 'submit' for better accessibility)
    DOM.profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // BUG FIX: Removed the redundant 'start-session-btn' click handler. 
        // We now rely purely on the form's 'submit' event.
        if (validateForm()) {
            startSession();
        } else {
            // Optional: Provide visual feedback if validation fails
        }
    });

    // Chat functionality
    DOM.sendButton.addEventListener('click', sendMessage);
    DOM.studentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea logic
    DOM.studentInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = `${Math.min(this.scrollHeight, 100)}px`;
    });

    // Session controls
    DOM.endSessionButton.addEventListener('click', endSession);
    DOM.newSessionButton.addEventListener('click', startNewSession);
    DOM.downloadReportButton.addEventListener('click', downloadReport);
}

// ----------------------------------------------------------------
// 2. Profile Setup & Validation Logic
// ----------------------------------------------------------------

// Checks all fields and updates the Start button state
function updateStartButton() {
    const age = DOM.ageInput.value;
    const symptoms = DOM.symptomsSelect.value;
    const behavior = DOM.behaviorInput.value.trim();
    const tone = DOM.toneInput.value.trim();

    const isValid = age && symptoms && behavior && tone;
    
    // Updates UI based on validation status
    if (isValid) {
        DOM.startButton.disabled = false;
        DOM.formStatus.textContent = 'Ready to start training session';
        DOM.formStatus.style.color = 'var(--accent-color)'; // Using CSS variable for better consistency
    } else {
        DOM.startButton.disabled = true;
        DOM.formStatus.textContent = 'Please fill all fields to continue';
        DOM.formStatus.style.color = 'var(--text-medium)';
    }

    // Live feedback on form fields (Optional: can be disabled if too distracting)
    if (age) DOM.ageInput.style.borderColor = '#e0e0e0';
    if (symptoms) DOM.symptomsSelect.style.borderColor = '#e0e0e0';
    if (behavior) DOM.behaviorInput.style.borderColor = '#e0e0e0';
    if (tone) DOM.toneInput.style.borderColor = '#e0e0e0';
}

// Full form validation with error message display
function validateForm() {
    let isValid = true;
    
    // Validate age (using number type validation)
    const age = parseInt(DOM.ageInput.value);
    if (!age || age < 18 || age > 100) {
        showError('age-error');
        DOM.ageInput.style.borderColor = 'var(--error-color)';
        isValid = false;
    } else {
        hideError('age-error');
        DOM.ageInput.style.borderColor = 'var(--accent-color)';
    }

    // Validate other fields
    const fields = [
        { id: 'symptoms', element: DOM.symptomsSelect }, 
        { id: 'behavior', element: DOM.behaviorInput }, 
        { id: 'tone', element: DOM.toneInput }
    ];

    fields.forEach(({ id, element }) => {
        const value = element.value.trim();
        const errorElementId = id + '-error'; // e.g., 'symptoms-error'
        
        if (!value) {
            showError(errorElementId);
            element.style.borderColor = 'var(--error-color)';
            isValid = false;
        } else {
            hideError(errorElementId);
            element.style.borderColor = 'var(--accent-color)';
        }
    });

    return isValid;
}

// Helper to show error message (using new CSS class 'input-error' and aria attribute)
function showError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.setAttribute('aria-hidden', 'false');
}

// Helper to hide error message
function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.setAttribute('aria-hidden', 'true');
}

// ----------------------------------------------------------------
// 3. Session Flow Management
// ----------------------------------------------------------------
function switchPage(pageNum) {
    const pages = ['profile-page', 'chat-page', 'feedback-page'];
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pages[pageNum - 1]).classList.add('active');
    
    currentPage = pageNum;
    
    // Auto-focus on chat input when switching to chat page
    if (pageNum === 2) {
        DOM.studentInput.focus();
    }
}

function startSession() {
    // Collect and store profile data
    sessionData.profile = {
        age: DOM.ageInput.value,
        symptoms: DOM.symptomsSelect.value,
        behavior: DOM.behaviorInput.value.trim(),
        tone: DOM.toneInput.value.trim()
    };

    sessionData.startTime = new Date();
    sessionData.messages = [];

    switchPage(2);

    // Initial patient message simulation
    setTimeout(() => {
        addPatientMessage(generateInitialPatientMessage());
        updateProgress();
    }, 1000);
}

function endSession() {
    sessionData.endTime = new Date();
    switchPage(3);
    generateFeedback();
}

function startNewSession() {
    // Reset all data
    sessionData = { profile: {}, messages: [], startTime: null, endTime: null };

    // Clear chat and feedback
    DOM.chatContainer.innerHTML = '';
    
    // Reset form fields
    DOM.profileForm.reset();
    
    // Reset UI elements
    DOM.markdownSection.classList.remove('show');
    DOM.markdownButtons.forEach(btn => btn.classList.remove('active'));
    DOM.progressBarFill.style.width = '0%';
    
    // Reset validation styles
    const allInputs = [DOM.ageInput, DOM.symptomsSelect, DOM.behaviorInput, DOM.toneInput];
    allInputs.forEach(input => input.style.borderColor = '#e0e0e0');
    document.querySelectorAll('.input-error').forEach(error => error.setAttribute('aria-hidden', 'true'));
    
    switchPage(1);
    updateStartButton();
}

// ----------------------------------------------------------------
// 4. Chat & Message Logic
// ----------------------------------------------------------------

function generateInitialPatientMessage() {
    const greetings = [
        "Hi... I'm not really sure how this works.",
        "Hello. I was told I should come here.",
        "Um, hi. This is my first time doing something like this.",
        "Hello doctor. I'm feeling pretty nervous about this.",
        "Hi there. I guess we should start talking?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function sendMessage() {
    const message = DOM.studentInput.value.trim();

    if (!message) return;

    // Add student message
    addStudentMessage(message);
    DOM.studentInput.value = '';
    DOM.studentInput.style.height = 'auto'; // Reset textarea height

    // Disable input while waiting for patient response
    DOM.studentInput.disabled = true;
    DOM.sendButton.disabled = true;

    // Simulate patient response after a delay
    setTimeout(() => {
        addPatientMessage(generatePatientResponse(message));
        updateProgress();
        // Re-enable input
        DOM.studentInput.disabled = false;
        DOM.sendButton.disabled = false;
        DOM.studentInput.focus();
    }, 1500);
}

function addMessage(role, message) {
    sessionData.messages.push({ role, message, timestamp: new Date() });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // If it's the patient, add the "Patient:" label
    if (role === 'patient') {
        messageDiv.innerHTML = `<strong>Patient:</strong> ${message}`;
    } else {
        messageDiv.textContent = message;
    }
    
    DOM.chatContainer.appendChild(messageDiv);
    // Scroll to the bottom of the chat container
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
}

const addStudentMessage = (message) => addMessage('student', message);
const addPatientMessage = (message) => addMessage('patient', message);


function generatePatientResponse(studentMessage) {
    // NOTE: This function is a placeholder for a real AI/LLM integration.
    // It currently uses simple random responses based on the selected symptom.
    const profile = sessionData.profile;
    const responses = {
        anxiety: [
            "I keep worrying about everything... what if something bad happens?",
            "I can't stop thinking about all the things that could go wrong.",
            "Do you think I'm overreacting? I feel like I am but I can't help it.",
            "My heart keeps racing and I don't know why."
        ],
        depression: [
            "I just don't see the point in anything anymore.",
            "Nothing seems to make me happy like it used to.",
            "I feel tired all the time, even when I sleep.",
            "It's hard to explain... everything just feels heavy."
        ],
        trauma: [
            "I don't really like talking about what happened.",
            "Sometimes I get these flashbacks and I freeze up.",
            "I know it's in the past, but it doesn't feel that way.",
            "I jump at every little sound now."
        ],
        // Default responses for confusion/hesitation (as seen in the original prompt)
        default: [
            "I'm not sure how to answer that.",
            "Can you tell me more about what you mean?",
            "That's something I've been thinking about too.",
            "I appreciate you asking."
        ]
    };

    const symptomResponses = responses[profile.symptoms] || responses.default;
    return symptomResponses[Math.floor(Math.random() * symptomResponses.length)];
}

function updateProgress() {
    // Progress calculation based on student messages (max 20 messages for 100%)
    const studentMessageCount = sessionData.messages.filter(m => m.role === 'student').length;
    const progress = Math.min((studentMessageCount / 20) * 100, 100);
    
    DOM.progressBarFill.style.width = `${progress}%`;
    DOM.progressBarFill.parentElement.setAttribute('aria-valuenow', progress);
}

// ----------------------------------------------------------------
// 5. Feedback & Report Generation
// ----------------------------------------------------------------

function generateFeedback() {
    const { startTime, endTime, profile, messages } = sessionData;
    const duration = Math.round((endTime - startTime) / 1000 / 60);
    const messageCount = messages.filter(m => m.role === 'student').length;
    const feedbackPage = document.getElementById('feedback-page');
    
    // Helper function to get text name of symptom from value
    const getSymptomText = (value) => {
        const option = DOM.symptomsSelect.querySelector(`option[value="${value}"]`);
        return option ? option.textContent : value;
    };
    
    const symptomText = getSymptomText(profile.symptoms);

    // Session summary
    feedbackPage.querySelector('#session-summary').innerHTML = `
        <p><strong>Session Duration:</strong> ${duration} minutes</p>
        <p><strong>Student Responses:</strong> ${messageCount}</p>
        <p><strong>Patient Profile:</strong> ${symptomText} (Age ${profile.age})</p>
    `;

    // Strengths
    feedbackPage.querySelector('#strengths-feedback').innerHTML = `
        <ul>
            <li>Maintained professional communication throughout the session.</li>
            <li>Showed active engagement with <strong>${messageCount}</strong> therapeutic responses.</li>
            <li>Demonstrated willingness to practice in a simulated environment.</li>
            <li>Completed a full session duration of <strong>${duration}</strong> minutes.</li>
        </ul>
    `;

    // Areas for improvement (Using more specific language)
    feedbackPage.querySelector('#improvement-feedback').innerHTML = `
        <ul>
            <li>Consider incorporating more <strong>open-ended questions</strong> to encourage patient elaboration.</li>
            <li>Practice <strong>reflective listening techniques</strong> to validate patient experiences.</li>
            <li>Focus on building rapport before moving to deeper therapeutic work.</li>
        </ul>
    `;

    // Recommendations (Tailored to profile)
    feedbackPage.querySelector('#recommendations-feedback').innerHTML = `
        <ul>
            <li>Review therapeutic questioning techniques specifically for **${symptomText}**.</li>
            <li>Practice more sessions with similar patient profiles to master initial engagement.</li>
            <li>Continue building clinical skills through supervised practice and case studies.</li>
        </ul>
    `;
}

function downloadReport() {
    const { startTime, endTime, profile, messages } = sessionData;
    
    // Calculate duration safely
    const duration = endTime ? Math.round((endTime - startTime) / 1000 / 60) : 'N/A';
    
    const getSymptomText = (value) => {
        const option = DOM.symptomsSelect.querySelector(`option[value="${value}"]`);
        return option ? option.textContent : value;
    };
    
    const reportContent = `
PSYCHOTHERAPY TRAINING SESSION REPORT
=====================================

Session Date: ${endTime.toLocaleDateString()}
Session End Time: ${endTime.toLocaleTimeString()}
Duration: ${duration} minutes

PATIENT PROFILE:
- Age: ${profile.age}
- Primary Symptoms: ${getSymptomText(profile.symptoms)}
- Behavior: ${profile.behavior} 
- Communication Tone: ${profile.tone}

SESSION TRANSCRIPT:
${messages.map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.message}`).join('\n')}

---
END OF REPORT
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `therapy-training-report-${new Date().toISOString().slice(0, 10)}.txt`;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}