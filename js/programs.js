// Programs fetcher for main website
// This file fetches programs from Firebase and updates the website

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: window.ENV?.FIREBASE_API_KEY || "your-api-key",
  authDomain: window.ENV?.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: window.ENV?.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: window.ENV?.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: window.ENV?.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: window.ENV?.FIREBASE_APP_ID || "your-app-id"
};

class ProgramsWidget {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Firebase
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const app = initializeApp(firebaseConfig);
            this.db = getFirestore(app);
            
            // Load and display programs
            await this.loadPrograms();
            
            // Set up auto-refresh every 5 minutes
            setInterval(() => {
                this.loadPrograms();
            }, 5 * 60 * 1000);
            
        } catch (error) {
            console.error('Error initializing programs:', error);
            this.showFallbackPrograms();
        }
    }

    async loadPrograms() {
        try {
            const { collection, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Query only active programs
            const q = query(
                collection(this.db, 'programs'), 
                where('isActive', '==', true),
                orderBy('createdAt', 'asc')
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                this.showFallbackPrograms();
                return;
            }

            let programsHtml = '';
            querySnapshot.forEach((doc) => {
                const program = doc.data();
                programsHtml += `
                    <li class="program-item">
                        <div class="program-time">
                            <i class="${program.icon}"></i>
                            <span>${program.timing}</span>
                        </div>
                        <div class="program-name">${program.name}</div>
                    </li>
                `;
            });

            // Update the programs list in the DOM
            const programsList = document.querySelector('.programs-list');
            if (programsList) {
                programsList.innerHTML = programsHtml;
            }

        } catch (error) {
            console.error('Error loading programs:', error);
            this.showFallbackPrograms();
        }
    }

    showFallbackPrograms() {
        // Fallback to the original hardcoded programs if Firebase fails
        const fallbackHtml = `
            <li class="program-item">
                <div class="program-time">
                    <i class="fas fa-sun"></i>
                    <span>Daily after Maghrib</span>
                </div>
                <div class="program-name">Riyad Us-Saliheen</div>
            </li>
            <li class="program-item">
                <div class="program-time">
                    <i class="fas fa-calendar-week"></i>
                    <span>Thursdays after Maghrib</span>
                </div>
                <div class="program-name">Contemplating the Day of Judgment</div>
            </li>
            <li class="program-item">
                <div class="program-time">
                    <i class="fas fa-users"></i>
                    <span>3rd Saturday Monthly</span>
                </div>
                <div class="program-name">Family Night</div>
            </li>
        `;

        const programsList = document.querySelector('.programs-list');
        if (programsList) {
            programsList.innerHTML = fallbackHtml;
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProgramsWidget();
    });
} else {
    new ProgramsWidget();
}