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
            console.error('Chapter error: ',error);
            throw error;
        }
    }
}

//create global instance
const storyManager = new StoryManager();
window.storyManager = storyManager;