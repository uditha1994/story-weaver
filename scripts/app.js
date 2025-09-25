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

    //Handle story form submission
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

        try {
            const storyId = await storyManager.createStory(storyData);
            this.resetCreateForm();
            showToast('Story created successfully!', 'success');
        } catch (error) {
            console.error('error creating story: ', error);
        }
    }

    resetCreateForm() {
        document.getElementById('story-from').reset();
    }

}

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

document.addEventListener('DOMContentLoaded', () => {
    window.add = new App();
});

// export for global access
window.appUtils = {
    showLoading
}