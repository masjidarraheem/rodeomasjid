// Board Members fetcher for main website
// This file fetches board members from Firebase and updates the website

// Firebase configuration using environment variables
const boardFirebaseConfig = {
  apiKey: window.ENV?.FIREBASE_API_KEY || "AIzaSyDeuget47p0lBCRK9EConW-FNmORpQc248",
  authDomain: window.ENV?.FIREBASE_AUTH_DOMAIN || "masjid-ar-raheem.firebaseapp.com",
  projectId: window.ENV?.FIREBASE_PROJECT_ID || "masjid-ar-raheem",
  storageBucket: window.ENV?.FIREBASE_STORAGE_BUCKET || "masjid-ar-raheem.appspot.com",
  messagingSenderId: window.ENV?.FIREBASE_MESSAGING_SENDER_ID || "290589406708",
  appId: window.ENV?.FIREBASE_APP_ID || "1:290589406708:web:e5e0cddb9077f74b0c62b1"
};

class BoardWidget {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Firebase
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Check if Firebase is already initialized
            let app;
            try {
                const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
                app = getApp();
            } catch {
                app = initializeApp(boardFirebaseConfig);
            }
            
            this.db = getFirestore(app);
            
            // Load and display board members
            await this.loadBoardMembers();
            
            // Set up auto-refresh every 5 minutes
            setInterval(() => {
                this.loadBoardMembers();
            }, 5 * 60 * 1000);
            
        } catch (error) {
            console.error('Error initializing board members:', error);
            this.showFallbackBoard();
        }
    }

    async loadBoardMembers() {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Query all board members (no index required)
            const querySnapshot = await getDocs(collection(this.db, 'boardMembers'));
            
            if (querySnapshot.empty) {
                this.showFallbackBoard();
                return;
            }

            // Collect and sort members
            const members = [];
            querySnapshot.forEach((doc) => {
                members.push(doc.data());
            });
            
            // Sort by order field
            members.sort((a, b) => (a.order || 999) - (b.order || 999));

            let boardHtml = '';
            members.forEach((member) => {
                boardHtml += `<li>${member.name}</li>`;
            });

            // Update the board list in the DOM
            const boardList = document.getElementById('board-members-list');
            if (boardList) {
                boardList.innerHTML = boardHtml;
            }

        } catch (error) {
            console.error('Error loading board members:', error);
            this.showFallbackBoard();
        }
    }

    showFallbackBoard() {
        // Show default board members if Firebase fails
        const fallbackHtml = `
            <li>Haneef Abdul-Mu'min</li>
            <li>Sh. Hamza Mehter</li>
            <li>Hasib Khan</li>
            <li>Fazal Rabbi</li>
            <li>Moiz Qureshi</li>
        `;

        const boardList = document.getElementById('board-members-list');
        if (boardList) {
            boardList.innerHTML = fallbackHtml;
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BoardWidget();
    });
} else {
    new BoardWidget();
}