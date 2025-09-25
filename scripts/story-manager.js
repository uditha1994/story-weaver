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
            }

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

            return docRef.id;

        } catch (error) {
            showLoading(false);
            console.error('error in chapter: ', error);
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

            return chapterRef.id;
        } catch (error) {
            showLoading(false);
            console.error('Chapter error: ', error);
            throw error;
        }
    }

    async getStories(filters = {}) {
        try {
            showLoading(true);

            let query = storiesCollection.where('status', '==', 'active');

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
                    query = query.orderBy('createdAt', 'decs');
            }

            query = query.limit(50);

            const snapshot = await query.get();
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

        } catch (error) {
            showLoading(false);
            console.error('Error in get Stories: ', error);
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
                .endAt(searchTerm.toLowerCase())
                .limit(20);

            const snapshot = await query.get();
            const results = []

            snapshot.forEach(doc => {
                const data = doc.data();
                results.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate()
                });
            });

            return results;

        } catch (error) {
            showLoading(false);
            return [];
        }
    }

    async likeStory(storyId) {
        try {
            await storiesCollection.doc(storyId).update({
                likes: firebase.firebase.FieldValue.increment(1)
            });
        } catch (error) {

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
            const featuredSnapshot = await storiesSnapshot
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

        }
    }
}

//create global instance
const storyManager = new StoryManager();
window.storyManager = storyManager;