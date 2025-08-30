import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class AdminPanel {
    constructor() {
        this.editingId = null;
        this.editingAnnouncementId = null;
        this.selectedIcon = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupAuth();
        this.setupLoginForm();
        this.setupLogout();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                this.currentUser = user;
                this.showAdminPanel();
                document.getElementById('userEmail').textContent = user.email;
            } else {
                // User is signed out
                this.currentUser = null;
                this.showLoginForm();
            }
        });
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                errorDiv.style.display = 'none';
            } catch (error) {
                errorDiv.textContent = `Login failed: ${error.message}`;
                errorDiv.style.display = 'block';
            }
        });
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    showLoginForm() {
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('adminContainer').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';
        
        // Initialize admin functionality only when authenticated
        this.setupTabs();
        this.setupIconSelector();
        this.setupForm();
        this.setupAnnouncementForm();
        this.loadPrograms();
        this.loadAnnouncements();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                document.getElementById(`${targetTab}Tab`).classList.add('active');
            });
        });
    }

    setupIconSelector() {
        const iconOptions = document.querySelectorAll('.icon-option');
        const hiddenIconInput = document.getElementById('selectedIcon');

        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Store selected icon
                this.selectedIcon = option.dataset.icon;
                hiddenIconInput.value = this.selectedIcon;
            });
        });
    }

    setupForm() {
        const form = document.getElementById('programForm');
        const cancelBtn = document.getElementById('cancelEdit');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingId) {
                this.updateProgram();
            } else {
                this.addProgram();
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.resetForm();
        });
    }

    async addProgram() {
        const name = document.getElementById('programName').value.trim();
        const timing = document.getElementById('programTiming').value.trim();
        const isActive = document.getElementById('isActive').value === 'true';

        if (!name || !timing || !this.selectedIcon) {
            this.showError('Please fill in all fields and select an icon');
            return;
        }

        try {
            await addDoc(collection(db, 'programs'), {
                name: name,
                timing: timing,
                icon: this.selectedIcon,
                isActive: isActive,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            this.showSuccess('Program added successfully!');
            this.resetForm();
            this.loadPrograms();
        } catch (error) {
            console.error('Error adding program:', error);
            this.showError('Error adding program. Please try again.');
        }
    }

    async updateProgram() {
        const name = document.getElementById('programName').value.trim();
        const timing = document.getElementById('programTiming').value.trim();
        const isActive = document.getElementById('isActive').value === 'true';

        if (!name || !timing || !this.selectedIcon) {
            this.showError('Please fill in all fields and select an icon');
            return;
        }

        try {
            const programRef = doc(db, 'programs', this.editingId);
            await updateDoc(programRef, {
                name: name,
                timing: timing,
                icon: this.selectedIcon,
                isActive: isActive,
                updatedAt: new Date()
            });

            this.showSuccess('Program updated successfully!');
            this.resetForm();
            this.loadPrograms();
        } catch (error) {
            console.error('Error updating program:', error);
            this.showError('Error updating program. Please try again.');
        }
    }

    async deleteProgram(id) {
        if (!confirm('Are you sure you want to delete this program?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'programs', id));
            this.showSuccess('Program deleted successfully!');
            this.loadPrograms();
        } catch (error) {
            console.error('Error deleting program:', error);
            this.showError('Error deleting program. Please try again.');
        }
    }

    editProgram(id, program) {
        this.editingId = id;
        
        // Fill form with existing data
        document.getElementById('programName').value = program.name;
        document.getElementById('programTiming').value = program.timing;
        document.getElementById('isActive').value = program.isActive.toString();

        // Select the icon
        document.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.icon === program.icon) {
                opt.classList.add('selected');
                this.selectedIcon = program.icon;
                document.getElementById('selectedIcon').value = program.icon;
            }
        });

        // Show cancel button and change submit button text
        document.getElementById('cancelEdit').style.display = 'inline-block';
        document.querySelector('button[type="submit"]').textContent = 'Update Program';

        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    resetForm() {
        this.editingId = null;
        this.selectedIcon = null;
        
        document.getElementById('programForm').reset();
        document.getElementById('selectedIcon').value = '';
        document.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        document.getElementById('cancelEdit').style.display = 'none';
        document.querySelector('button[type="submit"]').textContent = 'Add Program';
    }

    async loadPrograms() {
        const programsList = document.getElementById('programsList');
        
        try {
            const q = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                programsList.innerHTML = '<p class="loading">No programs found. Add your first program above.</p>';
                return;
            }

            let html = '';
            querySnapshot.forEach((docSnap) => {
                const program = docSnap.data();
                const id = docSnap.id;
                
                html += `
                    <div class="program-item">
                        <div class="program-info">
                            <div class="program-icon">
                                <i class="${program.icon}"></i>
                            </div>
                            <div class="program-details">
                                <h3>${program.name}</h3>
                                <p>${program.timing}</p>
                                <p style="font-size: 14px; color: ${program.isActive ? '#48bb78' : '#e53e3e'};">
                                    ${program.isActive ? '✓ Active' : '✗ Inactive'}
                                </p>
                            </div>
                        </div>
                        <div class="program-actions">
                            <button class="btn btn-primary" onclick="admin.editProgram('${id}', ${JSON.stringify(program).replace(/"/g, '&quot;')})">
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteProgram('${id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });

            programsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading programs:', error);
            programsList.innerHTML = '<p class="loading">Error loading programs. Please refresh the page.</p>';
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);

        // Hide error message if shown
        document.getElementById('errorMessage').style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);

        // Hide success message if shown
        document.getElementById('successMessage').style.display = 'none';
    }

    // Announcement methods
    setupAnnouncementForm() {
        const form = document.getElementById('announcementForm');
        const cancelBtn = document.getElementById('cancelAnnouncementEdit');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingAnnouncementId) {
                this.updateAnnouncement();
            } else {
                this.addAnnouncement();
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.resetAnnouncementForm();
        });
    }

    async addAnnouncement() {
        const title = document.getElementById('announcementTitle').value.trim();
        const message = document.getElementById('announcementMessage').value.trim();
        const priority = document.getElementById('announcementPriority').value;
        const expiryInput = document.getElementById('announcementExpiry').value;
        const isActive = document.getElementById('announcementActive').value === 'true';

        if (!title || !message) {
            this.showError('Please fill in title and message');
            return;
        }

        try {
            const announcementData = {
                title: title,
                message: message,
                priority: priority,
                isActive: isActive,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Add expiry date if provided
            if (expiryInput) {
                announcementData.expiryDate = new Date(expiryInput);
            }

            await addDoc(collection(db, 'announcements'), announcementData);

            this.showSuccess('Announcement added successfully!');
            this.resetAnnouncementForm();
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error adding announcement:', error);
            this.showError('Error adding announcement. Please try again.');
        }
    }

    async updateAnnouncement() {
        const title = document.getElementById('announcementTitle').value.trim();
        const message = document.getElementById('announcementMessage').value.trim();
        const priority = document.getElementById('announcementPriority').value;
        const expiryInput = document.getElementById('announcementExpiry').value;
        const isActive = document.getElementById('announcementActive').value === 'true';

        if (!title || !message) {
            this.showError('Please fill in title and message');
            return;
        }

        try {
            const updateData = {
                title: title,
                message: message,
                priority: priority,
                isActive: isActive,
                updatedAt: new Date()
            };

            // Add or remove expiry date
            if (expiryInput) {
                updateData.expiryDate = new Date(expiryInput);
            } else {
                updateData.expiryDate = null;
            }

            const announcementRef = doc(db, 'announcements', this.editingAnnouncementId);
            await updateDoc(announcementRef, updateData);

            this.showSuccess('Announcement updated successfully!');
            this.resetAnnouncementForm();
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error updating announcement:', error);
            this.showError('Error updating announcement. Please try again.');
        }
    }

    async deleteAnnouncement(id) {
        if (!confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'announcements', id));
            this.showSuccess('Announcement deleted successfully!');
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            this.showError('Error deleting announcement. Please try again.');
        }
    }

    editAnnouncement(id, announcement) {
        this.editingAnnouncementId = id;
        
        // Fill form with existing data
        document.getElementById('announcementTitle').value = announcement.title;
        document.getElementById('announcementMessage').value = announcement.message;
        document.getElementById('announcementPriority').value = announcement.priority;
        document.getElementById('announcementActive').value = announcement.isActive.toString();

        // Set expiry date if exists
        if (announcement.expiryDate) {
            const expiryDate = announcement.expiryDate.toDate ? announcement.expiryDate.toDate() : new Date(announcement.expiryDate);
            const localDateTime = new Date(expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('announcementExpiry').value = localDateTime;
        }

        // Show cancel button and change submit button text
        document.getElementById('cancelAnnouncementEdit').style.display = 'inline-block';
        document.querySelector('#announcementForm button[type="submit"]').textContent = 'Update Announcement';

        // Switch to announcements tab
        document.querySelector('[data-tab="announcements"]').click();

        // Scroll to form
        document.querySelector('#announcementsTab .form-section').scrollIntoView({ behavior: 'smooth' });
    }

    resetAnnouncementForm() {
        this.editingAnnouncementId = null;
        
        document.getElementById('announcementForm').reset();
        document.getElementById('cancelAnnouncementEdit').style.display = 'none';
        document.querySelector('#announcementForm button[type="submit"]').textContent = 'Add Announcement';
    }

    async loadAnnouncements() {
        const announcementsList = document.getElementById('announcementsList');
        
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                announcementsList.innerHTML = '<p class="loading">No announcements found. Add your first announcement above.</p>';
                return;
            }

            let html = '';
            querySnapshot.forEach((docSnap) => {
                const announcement = docSnap.data();
                const id = docSnap.id;
                
                // Check if expired
                let isExpired = false;
                let expiryText = '';
                if (announcement.expiryDate) {
                    const expiryDate = announcement.expiryDate.toDate ? announcement.expiryDate.toDate() : new Date(announcement.expiryDate);
                    isExpired = expiryDate < new Date();
                    expiryText = `Expires: ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`;
                }

                const priorityClass = `priority-${announcement.priority}`;
                
                html += `
                    <div class="announcement-item ${isExpired ? 'expired' : ''}">
                        <div class="announcement-info">
                            <div class="announcement-title">${announcement.title}</div>
                            <div class="announcement-message">${announcement.message}</div>
                            <div class="announcement-meta">
                                <span class="announcement-priority ${priorityClass}">${announcement.priority.toUpperCase()}</span>
                                <span style="color: ${announcement.isActive && !isExpired ? '#48bb78' : '#e53e3e'};">
                                    ${announcement.isActive && !isExpired ? '✓ Active' : '✗ Inactive'}
                                </span>
                                ${expiryText ? `<span>${expiryText}</span>` : ''}
                                ${isExpired ? '<span style="color: #e53e3e;">EXPIRED</span>' : ''}
                            </div>
                        </div>
                        <div class="program-actions">
                            <button class="btn btn-primary" onclick="admin.editAnnouncement('${id}', ${JSON.stringify(announcement).replace(/"/g, '&quot;')})">
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteAnnouncement('${id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });

            announcementsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading announcements:', error);
            announcementsList.innerHTML = '<p class="loading">Error loading announcements. Please refresh the page.</p>';
        }
    }
}

// Initialize the admin panel
const admin = new AdminPanel();

// Make admin available globally for onclick events
window.admin = admin;