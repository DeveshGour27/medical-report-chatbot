import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function clearDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log('Connected to MongoDB');
        
        // Clear Reports
        const reportRes = await mongoose.connection.collection('reports').deleteMany({});
        console.log('Deleted ' + reportRes.deletedCount + ' reports.');
        
        // Clear Chats
        const chatRes = await mongoose.connection.collection('chats').deleteMany({});
        console.log('Deleted ' + chatRes.deletedCount + ' chats.');
        
        // Reset Users healthProfile
        const userRes = await mongoose.connection.collection('users').updateMany({}, {
            $set: { healthProfile: null }
        });
        console.log('Reset health profiles for ' + userRes.modifiedCount + ' users.');
        
        await mongoose.disconnect();
        console.log('\n✅ Database wiped successfully. You can safely close this terminal.');
    } catch (err) {
        console.error('Error:', err);
    }
}

clearDB();
