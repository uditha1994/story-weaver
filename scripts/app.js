class App {
    constructor() {
        this.currentSection = 'home';
        this.isModalOpen = false;
        this.init();
    }

    init() {
        this.bindEvent();
    }

    //bind all event listeners
    bindEvent() {
        //navigation event
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.showSection('home');
        });
        document.getElementById('createBtn').addEventListener('click', () => {
            this.showSection('create');
        });
        document.getElementById('exploreBtn').addEventListener('click', () => {
            this.showSection('explore');
        });

        //form submission
        document.getElementById('storyForm').addEventListener('submit', (e) => {
            this.handleStorySubmission(e);
        });
    }

    //show specific section and update navigation
    showSection(sectionName) {
        //hide all section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        //remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        //show target section
        document.getElementById(`${sectionName}Section`).classList.add('active');
        document.getElementById(`${sectionName}Btn`).classList.add('active');

        this.currentSection = sectionName;
    }

    /**
     * Handle story form submission
     * @param {Event} e - form submit event
     */
    async handleStorySubmission(e) {
        e.preventDefault();

        const formData = new FormData(e.target);

        const storyData = {
            title: formData.get('title') || document.getElementById('storyTitle').value,
            genre: formData.get('genre') || document.getElementById('storyGenre').value,
            author: formData.get('author') || document.getElementById('authorName').value,
            content: formData.get('content') || document.getElementById('storyContent').value,
            prompt: formData.get('prompt') || document.getElementById('storyPrompt').value,
        };

        if (!this.validateStoryData(storyData)) {
            return;
        }

        try {
            const storyId = await storyManager.createStory(storyData);
            this.resetCreateForm();
            showToast('Story created successfully!', 'success');
        } catch (error) {
            console.error('error creating story: ', error);
        }
    }

    

    /**
     * Reset the create story form
     */
    resetCreateForm() {
        document.getElementById('story-from').reset();

        //clear any validation style
        document.querySelectorAll('.form-group input, .form-group select, .form-group textarea')
        .forEach(field => {
            field.classList.remove('error');
        });

    }

    /** 
     * validate story data before submission
     * @param {Object} storyData - Story data to validate
     * @returns {boolean} True if valid 
     */
    validateStoryData(storyData){
        const errors = [];

        if(!storyData.title || storyData.title.length < 3){
            errors.push('Title must be at least 3 characters long');
        }

        if(!storyData.genre){
            errors.push('Please select a genre');
        }

        if(!storyData.author || storyData.author.length < 2){
            errors.push('Author name must be at least 2 character long');
        }

        if(!storyData.content || storyData.content.length < 100){
            errors.push('Story content must be at least 100 character long');
        }

        if(!storyData.prompt || storyData.prompt.length < 10){
            errors.push('Story prompt must be at least 10 character long');
        }

        if(errors.length > 0){
            showToast(errors.join(' '), 'error');
            return false;
        }

        return true;
    }

}

//Utility functions

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add = 'active';
    } else {
        spinner.classList.remove = 'active';
    }
}

//show toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    //auto hide after 4 sec
    setTimeout(() => {
        toast.classList.remove('show')
    }, 4000);
}

function formatDate(date) {
    if (!date) return 'Unknown';

    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`

    return date.toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', () => {
    window.add = new App();
});

// export for global access
window.appUtils = {
    showLoading
}