//Manage CRUD operations for stories and chapters

class StoryManager {
    constructor() {
        this.currentStory = null;
        this.stories = [];
        this.filters = {
            genre: '',
            sort: 'newest'
        };
    }

    async createStory(storyData) {
        try {
            showLoading(true);

            //prepare story document
            const story = {
                title: storyData.title.trim(),
                genre: storyData.genre,
                author: storyData.author.trim(),
                content: storyData.content.trim(),
                prompt: storyData.prompt.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                chapterCount: 1,
                contributorCount: 1,
                likes: 0,
                views: 0,
                featured: false,
                status: 'active'
            };

            //add story to Firestore
            const docRef = await storiesCollection.add(story);

            //create the first chapter
            await this.addChapter(docRef.id, {
                content: storyData.content,
                author: storyData.author,
                prompt: storyData.prompt,
                chapterNumber: 1
            });

            showLoading(false);
            showToast('Story created successfully!', 'success');

            return docRef.id;

        } catch (error) {
            showLoading(false);
            console.error('error in chapter: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            throw error;
        }
    }

    async addChapter(storyId, chapterData) {
        try {
            showLoading(true);

            //prepare chapter document
            const chapter = {
                storyId: storyId,
                content: chapterData.content.trim(),
                author: chapterData.author.trim(),
                prompt: chapterData.prompt ? chapterData.prompt.trim() : '',
                chapterNumber: chapterData.chapterNumber,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                reports: 0
            }

            //add chapter to firestore
            const chapterRef = await chaptersCollection.add(chapter);

            //update story metadata
            await storiesCollection.doc(storyId).update({
                chapterCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                prompt: chapterData.prompt || ''
            });

            //update contributor count if new author
            const storyDoc = await storiesCollection.doc(storyId).get();
            const existingChapters = await chaptersCollection
                .where('storyId', '==', storyId)
                .where('author', '==', chapterData.author)
                .limit(1).get();

            if (existingChapters.empty) {
                await storiesCollection.doc(storyId).update({
                    contributorCount: firebase.firestore.FieldValue.increment(1)
                });
            }

            showLoading(false);
            showToast('Chapter added successfully', 'success');

            return chapterRef.id;
        } catch (error) {
            showLoading(false);
            console.error('Chapter error: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            throw error;
        }
    }

    async getStories(filters = {}) {
        try {
            showLoading(true);

            let query = storiesCollection.where('status', '==', 'active');

            // Try the complex query first
            try {
                if (filters.genre) {
                    query = query.where('genre', '==', filters.genre);
                }

                switch (filters.sort) {
                    case 'oldest':
                        query = query.orderBy('createdAt', 'asc');
                        break;
                    case 'popular':
                        query = query.orderBy('views', 'desc');
                        break;
                    case 'newest':
                    default:
                        query = query.orderBy('createdAt', 'desc');
                        break;
                }

                query = query.limit(50);
                const snapshot = await query.get();

                // Process results...
                const stories = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    stories.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate(),
                        updatedAt: data.updatedAt?.toDate()
                    });
                });

                this.stories = stories;
                showLoading(false);
                return stories;

            } catch (indexError) {
                console.warn('Index not ready, falling back to client-side sorting:', indexError);

                // Fallback: Get all stories and sort client-side
                const simpleQuery = storiesCollection
                    .where('status', '==', 'active')
                    .limit(50);

                const snapshot = await simpleQuery.get();
                let stories = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    stories.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate(),
                        updatedAt: data.updatedAt?.toDate()
                    });
                });

                // Client-side filtering and sorting
                if (filters.genre) {
                    stories = stories.filter(story => story.genre === filters.genre);
                }

                switch (filters.sort) {
                    case 'oldest':
                        stories.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                        break;
                    case 'popular':
                        stories.sort((a, b) => (b.views || 0) - (a.views || 0));
                        break;
                    case 'newest':
                    default:
                        stories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                        break;
                }

                this.stories = stories;
                showLoading(false);
                showToast('Using temporary sorting while database optimizes...', 'warning');
                return stories;
            }

        } catch (error) {
            showLoading(false);
            console.error('Error in getStories: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            return [];
        }
    }

    async getStoryWithChapters(storyId) {
        try {
            showLoading(true);

            const storyDoc = await storiesCollection.doc(storyId).get();

            if (!storyDoc.exists) {
                throw new Error('Story not found');
            }

            const storyData = storyDoc.data();

            const chapterSnapshot = await chaptersCollection
                .where('storyId', '==', storyId)
                .orderBy('chapterNumber', 'asc').get();

            const chapters = [];

            chapterSnapshot.forEach(doc => {
                const data = doc.data();
                chapters.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate()
                });
            });

            //increment view count
            await storiesCollection.doc(storyId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });

            const story = {
                id: storyDoc.id,
                ...storyData,
                chapters,
                createdAt: storyData.createdAt?.toDate(),
                updatedAt: storyData.updatedAt?.toDate()
            }

            this.currentStory = story;
            showLoading(false);

            return story;

        } catch (error) {
            showLoading(false);
            console.error('error in get story: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            throw error;
        }
    }

    async searchStories(searchTerm) {
        try {
            if (!searchTerm.trim()) {
                return this.stories;
            }

            showLoading(true);

            const query = storiesCollection.where('status', '==', 'active')
                .orderBy('title')
                .startAt(searchTerm.toLowerCase())
                .endAt(searchTerm.toLowerCase() + '\uf8ff')
                .limit(20);

            const snapshot = await query.get();
            const results = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate()
                });
            });

            showLoading(false);
            return results;

        } catch (error) {
            showLoading(false);
            console.error('error in search: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            return [];
        }
    }

    async likeStory(storyId) {
        try {
            await storiesCollection.doc(storyId).update({
                likes: firebase.firestore.FieldValue.increment(1)
            });

            showToast('Story liked', 'success');
        } catch (error) {
            console.error('error in like: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
        }
    }

    async reportStory(storyId, reason) {
        try {
            await db.collection('reports').add({
                storyId,
                reason,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'story'
            });
        } catch (error) {
            console.error('error in report: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
        }
    }

    async getStatistics() {
        try {
            //get total stories count
            const storiesSnapshot = await storiesCollection
                .where('status', '==', 'active').get();
            const totalStories = storiesSnapshot.size;

            //calculate total chapter
            let totalContributions = 0;
            storiesSnapshot.forEach(doc => {
                const data = doc.data();
                totalContributions += data.chapterCount || 1;
            });

            //get featured stories count
            const featuredSnapshot = await storiesCollection
                .where('featured', '==', true)
                .where('status', '==', 'active')
                .get();

            const featuredStories = featuredSnapshot.size;

            return {
                totalStories,
                totalContributions,
                featuredStories
            };
        } catch (error) {
            console.error('error in statistics: ', error);
            const message = handleFirebaseError(error);
            showToast(message, 'error');
            return {
                totalStories: 0,
                totalContributions: 0,
                featuredStories: 0
            };
        }
    }
}

//create global instance
const storyManager = new StoryManager();
window.storyManager = storyManager;