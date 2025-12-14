console.log("Quiz app starting...");

let quizData = [];
let currentRoundQuestions = [];
let currentTeamIndex = 0;
let currentQuestionIndex = null;
let usedQuestions = new Set();
let timer = null;
let timeLeft = 30;
let isFirstAttempt = true;
let passCount = 0;
let currentCategory = '';

// Teams data
let schools = [];
let roundResults = {};
let currentRoundScores = {};

// Track which team is currently answering
let answeringTeamIndex = 0;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing app...");
    initializeApp();
});

// Initialize the app
async function initializeApp() {
    try {
        // Load saved data - WAIT for schools to load
        await loadSchoolsData();
        loadRoundResults();
        
        console.log("Schools after loading:", schools);
        console.log("Schools length:", schools.length);
        
        // Check if schools are already set up - SIMPLIFIED LOGIC
        const hasValidSchools = schools.length > 0 && 
                               schools.some(school => school.name && school.name.trim() !== '');
        
        if (hasValidSchools) {
            console.log("✅ Valid schools found, loading round selection...");
            showRoundSelection();
        } else {
            console.log("❌ No valid schools found, showing setup...");
            // Only load default schools if we don't have any schools
            if (schools.length === 0) {
                loadDefaultSchools();
            }
            showSchoolSetup();
        }
        
        // Load questions
        loadQuestions();
        
        // Add control button listeners
        setupControlButtons();
        
    } catch (error) {
        console.error("Error initializing app:", error);
        // Fallback: show school setup
        if (schools.length === 0) {
            loadDefaultSchools();
        }
        showSchoolSetup();
        loadQuestions();
        setupControlButtons();
    }
}

// Load default school structure
function loadDefaultSchools() {
    if (schools.length === 0) {
        schools = [
            { id: 1, name: "School 1", representative: "", members: ["", "", "", ""], logo: "", scores: {} },
            { id: 2, name: "School 2", representative: "", members: ["", "", "", ""], logo: "", scores: {} },
            { id: 3, name: "School 3", representative: "", members: ["", "", "", ""], logo: "", scores: {} },
            { id: 4, name: "School 4", representative: "", members: ["", "", "", ""], logo: "", scores: {} },
            { id: 5, name: "School 5", representative: "", members: ["", "", "", ""], logo: "", scores: {} },
            { id: 6, name: "School 6", representative: "", members: ["", "", "", ""], logo: "", scores: {} }
        ];
    }
}

// Load schools from schools.json
async function loadSchoolsData() {
    try {
        console.log("Attempting to load schools from schools.json...");
        const response = await fetch('schools.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Raw data from schools.json:", data);
        
        if (data && Array.isArray(data.schools)) {
            schools = data.schools;
            console.log("✅ Successfully loaded schools from JSON:", schools);
            
            // Validate that we have the expected number of schools
            if (schools.length < 6) {
                console.warn("⚠️ schools.json has less than 6 schools. Filling with default schools.");
                fillMissingSchools();
            }
        } else {
            throw new Error("Invalid schools.json format - missing schools array");
        }
        
    } catch (error) {
        console.log("❌ Error loading schools.json:", error.message);
        console.log("🔄 Using default schools structure");
        
        // If JSON file doesn't exist or has errors, use default schools
        if (schools.length === 0) {
            loadDefaultSchools();
        }
    }
}
// Save schools to JSON file (download approach)
async function saveSchoolsData() {
    try {
        const dataToSave = {
            lastUpdated: new Date().toISOString(),
            schools: schools
        };
        
        // Use download approach since we can't write files directly from browser
        downloadSchoolsJSON(dataToSave);
        console.log("Schools data prepared for saving");
        
        // Show success message
        showMessage('Schools data updated! File download initiated.', 'success');
    } catch (error) {
        console.error("Error saving schools data:", error);
        showMessage('Error saving schools data', 'error');
    }
}

// Client-side JSON file download
function downloadSchoolsJSON(dataToSave = null) {
    if (!dataToSave) {
        dataToSave = {
            lastUpdated: new Date().toISOString(),
            schools: schools
        };
    }
    
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = 'schools.json';
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Load round results from localStorage (keep this for competition data)
function loadRoundResults() {
    const savedResults = localStorage.getItem('quizRoundResults');
    if (savedResults) {
        roundResults = JSON.parse(savedResults);
        console.log("Loaded round results from LocalStorage:", roundResults);
    }
}

// Save round results to localStorage (keep this for competition data)
function saveRoundResults() {
    localStorage.setItem('quizRoundResults', JSON.stringify(roundResults));
    console.log("Saved round results to LocalStorage");
}

// Setup control buttons with options menu
function setupControlButtons() {
    const optionsBtn = document.getElementById('options-btn');
    const optionsMenu = document.getElementById('options-menu');
    const closeOptionsBtn = document.getElementById('close-options-btn');
    
    // Toggle options menu
    optionsBtn.addEventListener('click', function() {
        optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'flex' : 'none';
    });
    
    // Close options menu
    closeOptionsBtn.addEventListener('click', function() {
        optionsMenu.style.display = 'none';
    });
    
    // Menu button listeners
    document.getElementById('manage-schools-btn').addEventListener('click', function() {
        optionsMenu.style.display = 'none';
        showSchoolManagementPage();
    });
    
    document.getElementById('reset-schools-btn').addEventListener('click', function() {
        optionsMenu.style.display = 'none';
        resetSchools();
    });
    document.getElementById('update-score-btn').addEventListener('click', function() {
        optionsMenu.style.display = 'none';
        updateScores();
    });
    
    document.getElementById('reset-all-btn').addEventListener('click', function() {
        optionsMenu.style.display = 'none';
        resetAllData();
    });
    
    // Add save schools button listener
    document.getElementById('save-schools-btn').addEventListener('click', function() {
        optionsMenu.style.display = 'none';
        downloadSchoolsJSON();
        showMessage('Schools data downloaded as schools.json', 'info');
    });
}

// Setup quiz buttons
function setupQuizButtons() {
    const loadBtn = document.getElementById('load-q-btn');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const correctBtn = document.getElementById('correct-btn');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const passBtn = document.getElementById('pass-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (loadBtn) loadBtn.addEventListener('click', loadQuestion);
    if (startTimerBtn) startTimerBtn.addEventListener('click', startTimerManually);
    if (correctBtn) correctBtn.addEventListener('click', markCorrect);
    if (showAnswerBtn) showAnswerBtn.addEventListener('click', showAnswer);
    if (passBtn) passBtn.addEventListener('click', passQuestion);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
}

// Load questions from JSON
function loadQuestions() {
    fetch('question.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Questions loaded:", data);
            quizData = data.questions || [];
            if (document.getElementById('round-selection').style.display !== 'none') {
                buildRoundButtons();
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            showMessage('Error loading questions. Please check console.', 'error');
        });
}

// Show school setup screen
function showSchoolSetup() {
    const container = document.getElementById('school-setup-container');
    
    let setupHTML = `
        <div class="school-setup">
            <h2>🏫 School Registration</h2>
            <p>Enter details for all 6 participating schools</p>
            <div class="schools-input-container">
    `;
    
    schools.forEach((school, index) => {
        setupHTML += `
            <div class="school-input-group">
                <h3>School ${index + 1}</h3>
                <div class="school-input-row">
                    <input type="text" id="school-name-${index}" value="${school.name}" 
                           placeholder="School Name" class="school-name">
                </div>
                <div class="school-input-row">
                    <input type="text" id="school-rep-${index}" value="${school.representative}" 
                           placeholder="Representative Name" class="school-name">
                </div>
                <div class="members-section">
                    <label>Team Members:</label>
                    ${school.members.map((member, memberIndex) => `
                        <input type="text" id="school-${index}-member-${memberIndex}" 
                               value="${member}" placeholder="Member ${memberIndex + 1}" class="member-input">
                    `).join('')}
                </div>
                <div class="school-input-row">
                    <input type="file" id="school-logo-${index}" accept="image/*" class="school-logo" 
                           onchange="handleLogoUpload(event, ${index})">
                    <button type="button" onclick="document.getElementById('school-logo-${index}').click()" 
                            class="btn btn-upload">📷 Upload Logo</button>
                </div>
                <div id="logo-preview-${index}" class="logo-preview">
                    ${school.logo ? `<img src="${school.logo}" class="logo-preview-img">` : ''}
                </div>
            </div>
        `;
    });
    
    setupHTML += `
            </div>
            <div class="setup-actions">
                <button onclick="saveSchoolsAndStart()" class="btn btn-primary btn-large">Start Quiz Competition</button>
                <button onclick="loadSampleSchools()" class="btn btn-secondary">Load Sample Schools</button>
            </div>
        </div>
    `;
    
    container.innerHTML = setupHTML;
    document.getElementById('round-selection').style.display = 'none';
    document.getElementById('quiz-section').style.display = 'none';
}

// Handle logo upload
function handleLogoUpload(event, schoolIndex) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`logo-preview-${schoolIndex}`);
            preview.innerHTML = `<img src="${e.target.result}" class="logo-preview-img">`;
            schools[schoolIndex].logo = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Load sample schools
function loadSampleSchools() {
    const sampleSchools = [
        "Greenwood High School",
        "Riverside Academy", 
        "Sunrise Public School",
        "Maplewood International",
        "Hilltop Secondary School",
        "Valley View Academy"
    ];
    
    schools.forEach((school, index) => {
        document.getElementById(`school-name-${index}`).value = sampleSchools[index];
        document.getElementById(`school-rep-${index}`).value = `Representative ${index + 1}`;
        
        // Set sample members
        for (let i = 0; i < 4; i++) {
            document.getElementById(`school-${index}-member-${i}`).value = `Student ${i + 1}`;
        }
    });
}

// Save schools and start quiz
function saveSchoolsAndStart() {
    // Collect all school data
    schools.forEach((school, index) => {
        school.name = document.getElementById(`school-name-${index}`).value || `School ${index + 1}`;
        school.representative = document.getElementById(`school-rep-${index}`).value;
        
        // Collect members
        for (let i = 0; i < 4; i++) {
            school.members[i] = document.getElementById(`school-${index}-member-${i}`).value || '';
        }
    });
    
    // Validate that we have at least 2 schools with names
    const validSchools = schools.filter(s => s.name && s.name.trim() !== '');
    if (validSchools.length < 2) {
        showMessage('Please enter names for at least 2 schools!', 'error');
        return;
    }
    
    saveSchoolsData();
    showRoundSelection();
}

// Show round selection screen
function showRoundSelection() {
    document.getElementById('school-setup-container').innerHTML = '';
    document.getElementById('round-selection').style.display = 'block';
    document.getElementById('quiz-section').style.display = 'none';
    buildRoundButtons();
}

// Build round selection buttons with scores
function buildRoundButtons() {
    const container = document.getElementById('round-buttons');
    const scoresBar = document.getElementById('total-scores-bar');
    
    // Build total scores bar
    buildTotalScoresBar();
    
    // Build round buttons
    container.innerHTML = '';
    
    if (quizData.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <h3>No Quiz Rounds Available</h3>
                <p>Questions are loading or not configured.</p>
                <button onclick="loadQuestions()" class="btn btn-primary">Retry Loading</button>
            </div>
        `;
        return;
    }
    
    quizData.forEach(category => {
        const button = document.createElement('button');
        const categoryName = category.category;
        const isCompleted = roundResults[categoryName];
        
        if (isCompleted) {
            button.innerHTML = `${categoryName}<br><small>✅ Completed - View Results</small>`;
            button.className = 'round-btn round-btn-completed';
        } else {
            button.textContent = categoryName;
            button.className = 'round-btn round-btn-available';
        }
        
        button.onclick = () => startRound(category);
        container.appendChild(button);
    });
}

// Build total scores bar
function buildTotalScoresBar() {
    const scoresBar = document.getElementById('total-scores-bar');
    const totalScores = calculateTotalScores();
    
    let scoresHTML = `<h3>🏆 Total Competition Scores</h3>`;
    
    if (Object.keys(totalScores).length === 0) {
        scoresHTML += `<p>No rounds completed yet. Complete rounds to see scores.</p>`;
    } else {
        const sortedScores = Object.entries(totalScores)
            .sort(([,a], [,b]) => b - a);
        
        scoresHTML += `<div class="scores-grid">`;
        
        sortedScores.forEach(([schoolName, score], index) => {
            const school = schools.find(s => s.name === schoolName);
            const logo = school?.logo ? `<img src="${school.logo}" class="team-logo-small">` : '';
            const medal = index === 0 && score > 0 ? '🥇 ' : index === 1 && score > 0 ? '🥈 ' : '';
            
            scoresHTML += `
                <div class="score-card ${index === 0 && score > 0 ? 'score-card-winner' : ''}">
                    <div class="score-team">${medal}${logo}${schoolName}</div>
                    <div class="score-points">${score} pts</div>
                </div>
            `;
        });
        
        scoresHTML += `</div>`;
        
        // Show completed rounds
        const completedRounds = Object.keys(roundResults);
        if (completedRounds.length > 0) {
            scoresHTML += `
                <div class="completed-rounds">
                    <div class="completed-rounds-title">Completed Rounds:</div>
                    <div class="rounds-list">
                        ${completedRounds.map(round => 
                            `<span class="round-tag">${round}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    scoresBar.innerHTML = scoresHTML;
}

// Calculate total scores from all rounds
function calculateTotalScores() {
    const totalScores = {};
    
    schools.forEach(school => {
        totalScores[school.name] = 0;
    });
    
    Object.values(roundResults).forEach(round => {
        round.scores.forEach(score => {
            if (totalScores[score.team] !== undefined) {
                totalScores[score.team] += score.score;
            }
        });
    });
    
    return totalScores;
}

// Start a round
function startRound(category) {
    const categoryName = category.category;
    
    // Check if round is completed
    if (roundResults[categoryName]) {
        showRoundResultsPage(categoryName);
        return;
    }
    
    console.log("Starting round:", categoryName);
    
    currentRoundQuestions = category.questions || [];
    currentCategory = categoryName;
    
    if (currentRoundQuestions.length === 0) {
        alert('No questions found for this category!');
        return;
    }
    
    // Reset round state
    usedQuestions.clear();
    currentTeamIndex = 0;
    currentQuestionIndex = null;
    answeringTeamIndex = 0;
    isFirstAttempt = true;
    passCount = 0;
    
    // Reset scores for this round
    currentRoundScores = {};
    schools.forEach(school => {
        currentRoundScores[school.name] = 0;
    });
    
    // Show quiz section
    document.getElementById('round-selection').style.display = 'none';
    document.getElementById('quiz-section').style.display = 'block';
    document.getElementById('topic-title').textContent = `${categoryName.toUpperCase()} ROUND`;
    document.getElementById('question-answer-section').style.display = 'none';
    
    // Setup quiz buttons
    setupQuizButtons();
    
    prepareTeamTurn();
}

// Prepare for team's turn to choose question
function prepareTeamTurn() {
    document.getElementById('global-timer').style.display = 'none';
    // Check if all questions used
    if (usedQuestions.size >= 18) {
        showRoundCompletePage();
        return;
    }
    
    const currentTeam = schools[currentTeamIndex];
    
    // Show current team
    let teamDisplay = currentTeam.name;
    if (currentTeam.logo) {
        teamDisplay = `<img src="${currentTeam.logo}" class="team-logo-medium"> ${currentTeam.name}`;
    }
    
    document.getElementById('current-team').innerHTML = 
        `${teamDisplay}'s turn to choose question (1-18)`;
    document.getElementById('current-team').style.display = 'block';
    
    document.getElementById('qnum-box').style.display = 'block';
    document.getElementById('question-answer-section').style.display = 'none';
    document.getElementById('message').style.display = 'none';
    
    document.getElementById('qnum-input').value = '';
    document.getElementById('qnum-input').focus();
    
    updateUsedQuestionsDisplay();
    updateScoreboard();
}

// Update used questions display
function updateUsedQuestionsDisplay() {
    const container = document.getElementById('used-questions');
    
    if (usedQuestions.size === 0) {
        container.innerHTML = '';
        return;
    }
    
    const usedArray = Array.from(usedQuestions).sort((a, b) => a - b);
    container.innerHTML = `
        <div class="used-questions-title">Used Questions:</div>
        <div class="used-questions-list">
            ${usedArray.map(num => `<span class="used-question-tag">${num}</span>`).join('')}
        </div>
    `;
}

// Load question based on number input
function loadQuestion() {
    const input = document.getElementById('qnum-input');
    const questionNum = parseInt(input.value);
    
    if (isNaN(questionNum) || questionNum < 1 || questionNum > 18) {
        showMessage('Please enter a valid question number (1-18)', 'error');
        return;
    }
    
    if (usedQuestions.has(questionNum)) {
        console.log('already used ')
        showMessage('This question has already been used!', 'error');
        return;
    }
    
    // Valid question number
    usedQuestions.add(questionNum);
    currentQuestionIndex = questionNum - 1;
    
    // Set answering team
    answeringTeamIndex = currentTeamIndex;
    isFirstAttempt = true;
    passCount = 0;
    
    document.getElementById('qnum-box').style.display = 'none';
    document.getElementById('question-answer-section').style.display = 'block';
    document.getElementById('message').style.display = 'block';
    
    showQuestion();
    updateUsedQuestionsDisplay();
}

// Display the current question
function showQuestion() {
    if (currentQuestionIndex === null) return;
    
    const question = currentRoundQuestions[currentQuestionIndex];
    const currentTeam = schools[answeringTeamIndex];
    document.getElementById('global-timer').style.display = 'block';
    // Show answering team
    let teamDisplay = currentTeam.name;
    if (currentTeam.logo) {
        teamDisplay = `<img src="${currentTeam.logo}" class="team-logo-medium"> ${currentTeam.name}`;
    }
    
    const pointsInfo = isFirstAttempt ? " (10 points for correct answer)" : " (5 points for correct answer)";
    document.getElementById('current-team').innerHTML = `${teamDisplay} is answering${pointsInfo}`;
    
    // Display question
    document.getElementById('question-text-en').textContent = question.question;
    document.getElementById('question-text-np').textContent = question.question_np;
    
    const imageContainer = document.getElementById('question-image-container');
    const questionImage = document.getElementById('question-image');
    
    if (question.image && question.image.trim() !== '') {
        questionImage.src = question.image;
        questionImage.alt = question.question;
        imageContainer.style.display = 'block';
        
        // Add cultural round styling
        document.getElementById('quiz-section').classList.add('cultural-round');
    } else {
        imageContainer.style.display = 'none';
        document.getElementById('quiz-section').classList.remove('cultural-round');
    }
    
    // Display answer (hidden initially)
    document.getElementById('answer-text-en').textContent = question.answer;
    document.getElementById('answer-text-np').textContent = question.answer_np;
     document.getElementById('message').style.display = 'none';
    document.getElementById('answer-box').style.display = 'none';
    
    // Setup timer
    timeLeft = isFirstAttempt ? 30 : 15;
    document.getElementById('timer').textContent = timeLeft;
    document.getElementById('timer').className = `timer-display ${!isFirstAttempt ? 'timer-warning' : ''}`;
    
    // Setup buttons
    document.getElementById('start-timer-btn').disabled = false;
    document.getElementById('start-timer-btn').textContent = 'Start Timer';
    document.getElementById('start-timer-btn').className = 'btn btn-primary';
    
    document.getElementById('correct-btn').style.display = 'inline-block';
    document.getElementById('correct-btn').disabled = true;
    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('show-answer-btn').disabled = true;
    document.getElementById('pass-btn').style.display = 'inline-block';
    document.getElementById('pass-btn').disabled = true;
    document.getElementById('next-btn').style.display = 'none';
    
    // Clear existing timer
    clearInterval(timer);
    
    // Auto-start timer for passed questions
    if (!isFirstAttempt) {
        startTimer();
    }
}

// Start timer manually
function startTimerManually() {
    document.getElementById('start-timer-btn').disabled = true;
    document.getElementById('start-timer-btn').textContent = 'Timer Running...';
    document.getElementById('start-timer-btn').className = 'btn btn-secondary';
    
    // Enable answer buttons
    document.getElementById('correct-btn').disabled = false;
    document.getElementById('show-answer-btn').disabled = false;
    document.getElementById('pass-btn').disabled = false;
    
    startTimer();
}

// Timer functions - FIXED VERSION
function startTimer() {
    clearInterval(timer);
    
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            document.getElementById('timer').textContent = "0";
            showMessage('Time\'s up!', 'info');
            passQuestion();
        }
    }, 1000);
}

// Mark answer as correct - FIXED VERSION
function markCorrect() {
    clearInterval(timer);
    document.getElementById('timer').textContent = isFirstAttempt ? "30" : "15";
    
    const currentTeam = schools[answeringTeamIndex];
    const points = isFirstAttempt ? 10 : 5;
    
    // Add points
    currentRoundScores[currentTeam.name] += points;
    
    // Show answer
    document.getElementById('answer-box').style.display = 'block';
    
    // Update buttons
    document.getElementById('correct-btn').style.display = 'none';
    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('pass-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
    
    showMessage(`Correct! +${points} points for ${currentTeam.name}`, 'success');
    updateScoreboard();
}

// Show answer - FIXED VERSION
function showAnswer() {
    clearInterval(timer);
    //document.getElementById('timer').textContent = isFirstAttempt ? "30" : "15";
    
    document.getElementById('answer-box').style.display = 'block';
    
    // Update buttons
    document.getElementById('correct-btn').style.display = 'none';
    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('pass-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
}

// Pass question to next team - FIXED VERSION
function passQuestion() {
    if (passCount>4){
        clearInterval(timer)
        showMessage(`No Teams Could Answer the Question`, 'info');
        document.getElementById('current-team').innerHTML = `Question Passed to Audience`;
        // Update buttons
        document.getElementById('correct-btn').style.display = 'none';
        document.getElementById('show-answer-btn').style.display = 'inline-block';
        document.getElementById('pass-btn').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
    }
    else{
        clearInterval(timer);
        document.getElementById('timer').textContent = "15";
    
        passCount++;
        isFirstAttempt = false;
    
        // Move to next team
        answeringTeamIndex = (answeringTeamIndex + 1) % schools.length;
    
        const nextTeam = schools[answeringTeamIndex];
        let teamDisplay = nextTeam.name;
        if (nextTeam.logo) {
            teamDisplay = `<img src="${nextTeam.logo}" class="team-logo-medium"> ${nextTeam.name}`;
        }
    
        showMessage(`Passed to ${nextTeam.name} (5 points for correct answer)`, 'info');
        document.getElementById('current-team').innerHTML = `${teamDisplay}'s turn to answer (5 points for correct answer)`;
    
        // Reset timer display for passed question
        timeLeft = 15;
        document.getElementById('timer').textContent = "15";
        document.getElementById('timer').className = 'timer-display timer-warning';
    
    // Auto-start timer for passed question
        startTimer();
    }
}

// Move to next question - FIXED VERSION
function nextQuestion() {
    clearInterval(timer);
    document.getElementById('timer').textContent = "30";
    document.getElementById('timer').className = 'timer-display';
    
    // Move to next team for question selection
    currentTeamIndex = (currentTeamIndex + 1) % schools.length;
    prepareTeamTurn();
}

// Update scoreboard
function updateScoreboard() {
    const container = document.getElementById('scoreboard');
    
    const sortedScores = Object.entries(currentRoundScores)
        .sort(([,a], [,b]) => b - a);
    
    let scoreboardHTML = '<ul class="scoreboard-list">';
    
    sortedScores.forEach(([team, score]) => {
        scoreboardHTML += `
            <li class="scoreboard-item">
                <span>${team}</span>
                <strong>${score} points</strong>
            </li>
        `;
    });
    document.getElementById('global-timer').style.display = 'none';
    scoreboardHTML += '</ul>';
    container.innerHTML = scoreboardHTML;
}

// Show school management in full page
function showSchoolManagementPage() {
    const modalHTML = `
        <div class="full-page-modal" id="schools-management-modal">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>🏫 Schools Management</h2>
                    <div class="subtitle">Complete details of all participating schools</div>
                </div>
                
                <div class="schools-grid">
                    ${schools.map((school, index) => `
                        <div class="school-card">
                            <div class="school-card-header">
                                ${school.logo ? `<img src="${school.logo}" class="school-logo-large">` : '<div class="school-logo-large" style="background:#bdc3c7; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8em;">No Logo</div>'}
                                <h3>${school.name || `School ${index + 1}`}</h3>
                            </div>
                            <div class="school-details">
                                <div class="detail-item">
                                    <span class="detail-label">Representative:</span>
                                    <span class="detail-value">${school.representative || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Team Members:</span>
                                    <ul class="members-list">
                                        ${school.members.map((member, i) => 
                                            `<li>${member || `Member ${i + 1} (Not set)`}</li>`
                                        ).join('')}
                                    </ul>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Total Score:</span>
                                    <span class="detail-value">${calculateSchoolTotalScore(school.name)} points</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="full-page-actions">
                    <button onclick="editSchoolsFromPage()" class="btn btn-primary">✏️ Edit Schools</button>
                    <button onclick="downloadSchoolsJSON()" class="btn btn-outline">💾 Save to File</button>
                    <button onclick="closeFullPageModal()" class="btn btn-secondary">← Back to Home</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Show round results in full page
function showRoundResultsPage(categoryName) {
    const roundResult = roundResults[categoryName];
    
    const modalHTML = `
        <div class="full-page-modal" id="round-results-modal">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>${categoryName.toUpperCase()} ROUND - RESULTS</h2>
                    <div class="subtitle">Final standings and scores</div>
                </div>
                
                <div class="results-grid">
                    ${roundResult.scores.map((score, index) => {
                        const school = schools.find(s => s.name === score.team);
                        const isWinner = index === 0 && score.score > 0;
                        const medal = isWinner ? '🥇' : index === 1 && score.score > 0 ? '🥈'  : '';
                        
                        return `
                            <div class="result-card ${isWinner ? 'winner' : ''}">
                                <div class="result-rank">#${index + 1}</div>
                                <div class="result-school">
                                    ${school?.logo ? `<img src="${school.logo}" class="team-logo-small">` : ''}
                                    ${score.team}
                                </div>
                                <div class="result-score">${score.score} points</div>
                                ${medal ? `<div class="result-medal">${medal}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="rounds-summary">
                    <h3>📊 Competition Summary</h3>
                    <div class="rounds-list">
                        ${Object.keys(roundResults).map(round => 
                            `<span class="round-badge">${round}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="full-page-actions">
                    <button onclick="closeFullPageModal()" class="btn btn-primary">← Back to Home</button>
                    <button onclick="exportResultsToFile()" class="btn btn-outline">📥 Download Results</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
function updateScores() {
    const modalHTML = `
        <div class="full-page-modal" id="update-scores-modal">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>📊 Update Scores</h2>
                    <div class="subtitle">Manage competition scores and results</div>
                </div>
                
                <div class="scores-management-options">
                    <div class="schools-grid">
                        <!-- Manual Score Editing -->
                        <div class="school-card">
                            <div class="school-card-header">
                                <div style="font-size: 3em;">✏️</div>
                                <h3>Edit Scores Manually</h3>
                            </div>
                            <div class="school-details">
                                <p>Change individual scores for each school in every round</p>
                            </div>
                            <div class="full-page-actions">
                                <button onclick="showManualScoreEditor()" class="btn btn-primary">
                                    Open Score Editor
                                </button>
                            </div>
                        </div>
                        
                        <!-- Clear Scores -->
                        <div class="school-card">
                            <div class="school-card-header">
                                <div style="font-size: 3em;">🧹</div>
                                <h3>Clear All Scores</h3>
                            </div>
                            <div class="school-details">
                                <p>Reset all scores and start fresh. Schools and questions are preserved.</p>
                            </div>
                            <div class="full-page-actions">
                                <button onclick="showClearScoresConfirmation()" class="btn btn-danger">
                                    Clear All Scores
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Current Scores Overview -->
                <div class="current-scores-overview">
                    <h3 class="quiz-title">📈 Current Competition Status</h3>
                    ${buildCurrentScoresOverview()}
                </div>

                <div class="full-page-actions">
                    <button onclick="closeFullPageModal()" class="btn btn-secondary">← Back to Competition</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Build overview of current scores
function buildCurrentScoresOverview() {
    if (Object.keys(roundResults).length === 0) {
        return `
            <div class="no-data-message">
                <div style="font-size: 4em; margin-bottom: 20px;">📊</div>
                <h4>No Scores Yet</h4>
                <p>Start the competition to see scores here</p>
            </div>
        `;
    }

    const totalScores = calculateTotalScores();
    const sortedSchools = Object.entries(totalScores).sort(([,a], [,b]) => b - a);

    let overviewHTML = '<div class="scores-grid">';

    sortedSchools.forEach(([schoolName, totalScore], index) => {
        const school = schools.find(s => s.name === schoolName);
        const medal = index === 0 && totalScore > 0 ? '🥇 ' : index === 1 && totalScore > 0 ? '🥈 ' : '';
        
        overviewHTML += `
            <div class="score-card ${index === 0 && totalScore > 0 ? 'score-card-winner' : ''}">
                <div class="score-team">
                    ${medal}${school?.logo ? `<img src="${school.logo}" class="team-logo-small">` : ''}${schoolName}
                </div>
                <div class="score-points">${totalScore} pts</div>
                <div class="round-breakdown">
                    ${Object.entries(roundResults).map(([round, result]) => {
                        const roundScore = result.scores.find(s => s.team === schoolName)?.score || 0;
                        return roundScore > 0 ? `<div class="round-score-item">${round}: ${roundScore} pts</div>` : '';
                    }).join('')}
                </div>
            </div>
        `;
    });

    overviewHTML += '</div>';
    return overviewHTML;
}

// Show manual score editor
function showManualScoreEditor() {
    closeFullPageModal();
    
    const modalHTML = `
        <div class="full-page-modal" id="manual-score-editor">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>✏️ Manual Score Editor</h2>
                    <div class="subtitle">Edit scores for each school and round</div>
                </div>
                
                <div class="score-editor-container">
                    ${buildScoreEditorForm()}
                </div>

                <div class="full-page-actions">
                    <button onclick="saveManualScores()" class="btn btn-success">💾 Save All Changes</button>
                    <button onclick="updateScores()" class="btn btn-secondary">← Back to Score Management</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Build the score editor form
function buildScoreEditorForm() {
    let formHTML = '';
    
    // Get all available rounds
    const allRounds = [...new Set([...quizData.map(cat => cat.category), ...Object.keys(roundResults)])];
    
    allRounds.forEach(roundName => {
        formHTML += `
            <div class="school-input-group">
                <h3>${roundName.toUpperCase()} ROUND</h3>
                <div class="schools-input-container">
        `;
        
        schools.forEach(school => {
            const currentScore = roundResults[roundName]?.scores.find(s => s.team === school.name)?.score || 0;
            
            formHTML += `
                <div class="school-input-row">
                    <div class="school-name" style="flex: 1; display: flex; align-items: center; gap: 10px;">
                        ${school.logo ? `<img src="${school.logo}" class="team-logo-small">` : ''}
                        <span>${school.name}</span>
                    </div>
                    <input type="number" 
                           id="score-${roundName}-${school.name}" 
                           value="${currentScore}"
                           min="0" 
                           max="1000"
                           class="qnum-input"
                           placeholder="0">
                </div>
            `;
        });
        
        formHTML += `</div></div>`;
    });
    
    return formHTML;
}

// Save manually edited scores
function saveManualScores() {
    const allRounds = [...new Set([...quizData.map(cat => cat.category), ...Object.keys(roundResults)])];
    
    allRounds.forEach(roundName => {
        const roundScores = [];
        
        schools.forEach(school => {
            const input = document.getElementById(`score-${roundName}-${school.name}`);
            if (input) {
                const score = parseInt(input.value) || 0;
                if (score > 0) {
                    roundScores.push({
                        team: school.name,
                        score: score
                    });
                }
            }
        });
        
        if (roundScores.length > 0) {
            roundResults[roundName] = {
                date: new Date().toISOString(),
                scores: roundScores.sort((a, b) => b.score - a.score)
            };
        } else {
            delete roundResults[roundName];
        }
    });
    
    localStorage.setItem('quizRoundResults', JSON.stringify(roundResults));
    closeFullPageModal();
    showMessage('✅ All scores updated successfully!', 'success');
    
    if (document.getElementById('round-selection').style.display === 'block') {
        buildRoundButtons();
    }
}

// Show clear scores confirmation
function showClearScoresConfirmation() {
    closeFullPageModal();
    
    const modalHTML = `
        <div class="full-page-modal" id="clear-scores-modal">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>🧹 Clear All Scores</h2>
                    <div class="subtitle">This action cannot be undone</div>
                </div>
                
                <div class="warning-section">
                    <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                    <h3>Warning: This action is permanent!</h3>
                    <div class="message message-error">
                        <strong>All scores and round results will be permanently deleted</strong>
                    </div>
                </div>

                <div class="schools-grid">
                    <div class="school-card">
                        <h3>✅ What will be KEPT:</h3>
                        <ul class="members-list">
                            <li>All school information (names, logos, representatives)</li>
                            <li>Team members data</li>
                            <li>All quiz questions</li>
                            <li>Current competition setup</li>
                        </ul>
                    </div>
                    
                    <div class="school-card">
                        <h3>❌ What will be DELETED:</h3>
                        <ul class="members-list">
                            <li>All round results (GK, Science, etc.)</li>
                            <li>Current round progress</li>
                            <li>Total competition scores</li>
                            <li>Leaderboard rankings</li>
                        </ul>
                    </div>
                </div>

                <div class="full-page-actions">
                    <button onclick="executeClearScores()" class="btn btn-danger">🧹 Yes, Clear All Scores</button>
                    <button onclick="updateScores()" class="btn btn-secondary">← Cancel and Go Back</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Function to actually clear the scores
function executeClearScores() {
    roundResults = {};
    currentRoundScores = {};
    localStorage.removeItem('quizRoundResults');
    
    if (document.getElementById('quiz-section').style.display === 'block') {
        currentRoundScores = {};
        schools.forEach(school => {
            currentRoundScores[school.name] = 0;
        });
        updateScoreboard();
    }
    
    closeFullPageModal();
    showMessage('✅ All scores have been cleared! Round results reset.', 'success');
    
    if (document.getElementById('round-selection').style.display === 'block') {
        buildRoundButtons();
    }
}

// Show round completion in full page
function showRoundCompletePage() {
    const roundResult = {
        date: new Date().toISOString(),
        scores: Object.entries(currentRoundScores).map(([team, score]) => ({
            team: team,
            score: score
        })).sort((a, b) => b.score - a.score)
    };
    
    roundResults[currentCategory] = roundResult;
    saveRoundResults();
    
    const modalHTML = `
        <div class="full-page-modal" id="round-complete-modal">
            <div class="full-page-content">
                <div class="full-page-header">
                    <h2>🎉 ROUND COMPLETED!</h2>
                    <div class="subtitle">${currentCategory.toUpperCase()} ROUND - FINAL RESULTS</div>
                </div>
                
                <div class="results-grid">
                    ${roundResult.scores.map((score, index) => {
                        const school = schools.find(s => s.name === score.team);
                        const isWinner = index === 0 && score.score > 0;
                        const medal = isWinner ? '🥇' : index === 1 && score.score > 0 ? '🥈' : '';
                        
                        return `
                            <div class="result-card ${isWinner ? 'winner' : ''}">
                                <div class="result-rank">#${index + 1}</div>
                                <div class="result-school">
                                    ${school?.logo ? `<img src="${school.logo}" class="team-logo-small">` : ''}
                                    ${score.team}
                                </div>
                                <div class="result-score">${score.score} points</div>
                                ${medal ? `<div class="result-medal">${medal}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="full-page-actions">
                    <button onclick="closeRoundCompleteAndReturn()" class="btn btn-primary btn-large">🏠 Return to Home</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Export results to downloadable JSON file
function exportResultsToFile() {
    const dataStr = JSON.stringify(roundResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = 'quiz_results.json';
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Utility functions for new pages
function calculateSchoolTotalScore(schoolName) {
    let total = 0;
    Object.values(roundResults).forEach(round => {
        round.scores.forEach(score => {
            if (score.team === schoolName) {
                total += score.score;
            }
        });
    });
    return total;
}

function closeFullPageModal() {
    const modal = document.querySelector('.full-page-modal');
    if (modal) {
        modal.remove();
    }
}

function closeRoundCompleteAndReturn() {
    closeFullPageModal();
    showRoundSelection();
}

function editSchoolsFromPage() {
    closeFullPageModal();
    showSchoolSetup();
}

// Update the existing functions to use new pages
function showRoundResults(categoryName) {
    showRoundResultsPage(categoryName);
}

function showRoundComplete() {
    showRoundCompletePage();
}

function showSchoolManagement() {
    showSchoolManagementPage();
}

// Reset functions
function resetSchools() {
    if (confirm('Reset all school data? This will clear all school information but keep round results.')) {
        schools = [];
        loadDefaultSchools();
        saveSchoolsData();
        showSchoolSetup();
    }
}

function resetAllData() {
    if (confirm('Reset ALL data? This will clear schools and all round results!')) {
        localStorage.removeItem('quizRoundResults');
        schools = [];
        roundResults = {};
        loadDefaultSchools();
        showSchoolSetup();
    }
}

// Utility functions
function showMessage(text, type) {
    console.log(text)
    
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = `message message-${type}`;
    messageElement.style.display = 'block';
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    const quizSection = document.getElementById('quiz-section');
    if (!quizSection || quizSection.style.display !== 'block') return;
    
    const questionSection = document.getElementById('question-answer-section');
    if (!questionSection || questionSection.style.display !== 'block') return;
    
    switch(event.key) {
        case '1':
            event.preventDefault();
            if (!document.getElementById('correct-btn').disabled) {
                document.getElementById('correct-btn').click();
            }
            break;
        case '2':
            event.preventDefault();
            if (!document.getElementById('show-answer-btn').disabled) {
                document.getElementById('show-answer-btn').click();
            }
            break;
        case '3':
            event.preventDefault();
            if (!document.getElementById('pass-btn').disabled) {
                document.getElementById('pass-btn').click();
            }
            break;
        case '4':
            event.preventDefault();
            if (document.getElementById('next-btn').style.display !== 'none') {
                document.getElementById('next-btn').click();
            }
            break;
        case ' ':
        case 'Spacebar':
            event.preventDefault();
            const startBtn = document.getElementById('start-timer-btn');
            if (startBtn && !startBtn.disabled) {
                startBtn.click();
            }
            break;
        case 'Enter':
            event.preventDefault();
            const qnumBox = document.getElementById('qnum-box');
            if (qnumBox && qnumBox.style.display === 'block') {
                document.getElementById('load-q-btn').click();
            }
            break;
    }
});