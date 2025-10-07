class App {
    constructor() {
        this.currentSection = 'home';
        this.isModalOpen = false;
        this.init();
    }

    init() {
        this.bindEvent();
        this.loadDashboardStats();
        this.showSection('home');
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
        document.getElementById('contributionForm').addEventListener('submit', (e) => {
            this.handleContributionSubmission(e);
        });

        //modal event
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        document.getElementById('storyModal').addEventListener('click', (e) => {
            if (e.target.id === 'storyModal') this.closeModal();
        });

        //filter events
        document.getElementById('genreFilter').addEventListener('change', (e) =>
            this.handleFilterChange(e));
        document.getElementById('sortFilter').addEventListener('change', (e) =>
            this.handleFilterChange(e));

        //key events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });

        //story card click event
        document.addEventListener('click', (e) => {
            const storyCard = e.target.closest('.story-card');
            if (storyCard) {
                const storyId = storyCard.getAttribute('data-story-id');
                if (storyId) {
                    this.openStoryModal(storyId);
                }
            }
        })
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

        switch (sectionName) {
            case 'home':
                this.loadDashboardStats();
                break;
            case 'explore':
                this.loadStories();
                break;
            case 'create':
                this.resetCreateForm();
                break;
        }
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
     * Handle contribution form submission
     * @param {Event} e - form submit event
     */
    async handleContributionSubmission(e) {
        e.preventDefault();

        const contributorName = document.getElementById('contributorName').value.trim();
        const contributionText = document.getElementById('contributionText').value.trim();
        const nextPrompt = document.getElementById('nextPrompt').value.trim();

        //validate contribution data
        if (!contributionText || !contributorName) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (contributionText.length < 50) {
            showToast('Contribution must be at least 50 characters long', 'error');
            return;
        }

        try {
            const currentStory = storyManager.currentStory;
            const nextChapterNumber = currentStory.chapters.length + 1;

            await storyManager.addChapter(currentStory.id, {
                content: contributionText,
                author: contributorName,
                prompt: nextPrompt,
                chapterNumber: nextChapterNumber
            });

            //reload the story to show the new chapter
            await this.openStoryModal(currentStory.id);

            //reset contribution form
            document.getElementById('contributionForm').reset();

        } catch (error) {
            console.error('Error adding contribution:', error);
            showToast(`Error adding contribution: ${error}`, 'error');
        }
    }

    /**
     * Open story modal and load story content
     * @param {string} stroyId - Story id to load
     */
    async openStoryModal(storyId) {
        try {
            const story = await storyManager.getStoryWithChapters(storyId);
            this.renderStoryModal(story);
            this.showModal();
        } catch (error) {
            console.error('Error loading story: ', error);
            showToast(`Error loading story: ${error}`, 'error');
        }
    }

    async renderStoryModal(story) {
        //update modal header
        document.getElementById('modalStoryTitle').textContent = story.title;
        document.getElementById('modalStoryGenre').textContent = story.genre;
        document.getElementById('modalStoryAuthor').textContent = story.author;
        document.getElementById('modalStoryDate').textContent =
            story.createdAt ? story.createdAt.toLocaleDateString() : 'Unkown';

        //Render chapter
        const chaptersContainer = document.getElementById('storyChapters');
        chaptersContainer.innerHTML = story.chapters.map(chapter =>
            this.createChapterHtml(chapter)).join('');

        //update current prompt
        const lastChapter = story.chapters[story.chapters.length - 1];
        const currentPromt = lastChapter?.prompt || 'Continue the story...';
        document.getElementById('currentPrompt').textContent = currentPromt;

    }

    /**
     * Create chapter HTML
     * @param {Object} chapter - Chapter Object
     * @returns {string} HTML string
     */
    createChapterHtml(chapter) {
        const createdDate = chapter.createdAt ?
            chapter.createdAt.toLocaleDateString() : 'Unkown';

        return `
            <div class="chapter">
                <div class="chapter-header">
                    <span class="chapter-number">Chapter ${chapter.chapterNumber}</span>
                    <span class="chapter-author">By ${chapter.author} . ${createdDate}</span>
                </div>
                <div class="chapter-content">
                    ${chapter.content}
                </div>
            </div>
        `;
    }

    /**
     * show the story modal
     */
    showModal() {
        const modal = document.getElementById('storyModal');
        modal.classList.add('active');
        this.isModalOpen = true;

        //prevent body scroll
        document.body.style.overflow = 'hidden';

        //focus management for accessibility
        modal.querySelector('.close-btn').focus();
    }

    /**
     * close the story modal
     */
    closeModal() {
        const modal = document.getElementById('storyModal');
        modal.classList.remove('active');
        this.isModalOpen = false;

        document.body.style.overflow = '';
        storyManager.currentStory = null;
    }

    /**
     * Load and Display statistiscs
     */
    async loadDashboardStats() {
        try {
            const stats = await storyManager.getStatistics();

            //animate couter update
            this.animateCounter('totalStories', stats.totalStories);
            this.animateCounter('totalContributions', stats.totalContributions);
            this.animateCounter('featuredStories', stats.featuredStories);

        } catch (error) {
            console.error('Error loading dashoard stats: ', error);
            showToast(`Error loading dashoard stats: ${error}`, error);
        }
    }

    /**
     * Animate counter from 0 to target value
     * @param {string} elementId - Id of element to animate
     * @param {number} targetValue - Target number to count to
     */
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue +
                (targetValue - startValue) * easeOutQuart);

            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        requestAnimationFrame(updateCounter);
    }

    /**
     * Load and display stories in the explore section
     */
    async loadStories() {
        const filters = {
            genre: document.getElementById('genreFilter').value,
            sort: document.getElementById('sortFilter').value
        }
        const stories = await storyManager.getStories(filters);
        this.renderStories(stories);
    }

    renderStories(stories) {
        const grid = document.getElementById('storiesGrid');

        if (stories.length === 0) {
            grid.innerHTML = `
                <div class-"no-stories">
                    <i class="fas fa-book-open"></i>
                    <h3>No stories found</h3>
                    <p>Be the first to create a story in this category</p>
                    <button class="submit-btn" onClick="app.showSection('create')">
                        <i class="fas fa-plus"></i> Create Story
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = stories.map(story => this.createStoryCard(story)).join(' ');
    }

    /**
     * create HTML for a story card
     * @param {Object} story - Story object
     * @returns {string} HTML string
     */
    createStoryCard(story) {
        const createdDate = story.createdAt ? story.createdAt.toLocaleDateString()
            : 'Unknown';
        const preview = story.content ? story.content.substring(0, 150) + '...'
            : 'No preview available';

        return `
            <div class="story-card" data-story-id="${story.id}">
                <div class="story-card-header">
                    <div>
                        <h3 class="story-title">${story.title}</h3>
                        <div class="story-meta">
                            <span class="story-author">by ${story.author}</span>
                            <span class="story-date">${createdDate}</span>
                        </div>
                    </div>
                    <span class="story-genre">${story.genre}</span>
                </div>

                <p class="story-preview">${preview}</p>

                <div class="story-stats">
                    <div class="story-stat">
                        <i class="fas fa-book"></i>
                        <span>${story.chapterCount || 1} chapters</span>
                    </div>
                    <div class="story-stat">
                        <i class="fas fa-users"></i>
                        <span>${story.contributorCount || 1} contributors</span>
                    </div>
                    <div class="story-stat">
                        <i class="fas fa-eye"></i>
                        <span>${story.views || 1} views</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * open story modal and load story content
     * @param {string} storyId - story ID to load
     */
    async openStoryModal(storyId) {
        try {
            const story = await storyManager.getStoryWithChapters(storyId);
            this.renderStoryModal(story);
            this.showModal();
        } catch (error) {
            console.error('Error loading story: ', error);
        }
    }

    /**
     * Handle filter changes i explore section
     * @param {Event} e - change event
     */
    handleFilterChange(e) {
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.loadStories();
        }, 300);
    }

    /**
     * Handle search functionality
     * @param {string} searchTerm - search query
     */
    async handleSearch(searchTerm) {
        if (searchTerm.trim()) {
            const results = await storyManager.searchStories(searchTerm);
            this.renderStories(results);
        } else {
            this.loadStories();
        }
    }

    /**
     * Reset the create story form
     */
    resetCreateForm() {
        document.getElementById('storyForm').reset();

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
    validateStoryData(storyData) {
        const errors = [];

        if (!storyData.title || storyData.title.length < 3) {
            errors.push('Title must be at least 3 characters long');
        }

        if (!storyData.genre) {
            errors.push('Please select a genre');
        }

        if (!storyData.author || storyData.author.length < 2) {
            errors.push('Author name must be at least 2 character long');
        }

        if (!storyData.content || storyData.content.length < 100) {
            errors.push('Story content must be at least 100 character long');
        }

        if (!storyData.prompt || storyData.prompt.length < 10) {
            errors.push('Story prompt must be at least 10 character long');
        }

        if (errors.length > 0) {
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
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
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
    window.app = new App();
});

// export for global access
window.appUtils = {
    showLoading,
    showToast,
    formatDate
}