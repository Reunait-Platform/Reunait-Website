import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PoliceStation from '../model/policeStationModel.js';
import User from '../model/userModel.js';

// Load environment variables
dotenv.config();

const seedTestData = async () => {
    try {
        console.log('🌱 Starting test data seeding (police stations + users)...');
        
        // Connect to MongoDB
        const mongoUrl = process.env.MONGO_URL;
        if (!mongoUrl) {
            console.error('❌ MONGO_URL environment variable not found');
            console.log('💡 Please set MONGO_URL in your .env file or environment');
            process.exit(1);
        }

        await mongoose.connect(mongoUrl, {
            dbName: process.env.DB_NAME || "missing_found_db"
        });

        console.log('✅ Connected to MongoDB successfully');

        // Clear existing test data (optional - comment out if you want to keep existing data)
        const clearExisting = process.argv.includes('--clear');
        const clearUsers = process.argv.includes('--clear-users');
        
        if (clearExisting) {
            await PoliceStation.deleteMany({});
            console.log('🗑️  Cleared existing police stations');
        }
        
        if (clearUsers) {
            // Clear only test users (those with @test or @example email domains)
            const deleted = await User.deleteMany({ 
                email: { $regex: /@(test|example)\./ }
            });
            console.log(`🗑️  Cleared ${deleted.deletedCount} test users by email`);
            
            // Also clear any user with null governmentIdNumber that might be blocking inserts
            // (MongoDB sparse unique index only allows ONE null value)
            const nullGovIdDeleted = await User.deleteMany({ 
                governmentIdNumber: null,
                $or: [
                    { email: { $regex: /@(test|example)\./ } },
                    { clerkUserId: { $regex: /^test_user_/ } }
                ]
            });
            if (nullGovIdDeleted.deletedCount > 0) {
                console.log(`🗑️  Cleared ${nullGovIdDeleted.deletedCount} test user(s) with null governmentIdNumber`);
            }
        }

        // Clerk user ID
        const clerkUserId = 'user_34TQ4EbF9fKERC62OyR7svA2b53';

        // Seed police stations with various scenarios
        const policeStations = [
            // India - with state and city
            {
                name: 'Central Police Station',
                country: 'India',
                state: 'Maharashtra',
                city: 'Mumbai',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Downtown Police Station',
                country: 'India',
                state: 'Maharashtra',
                city: 'Mumbai',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'North Police Station',
                country: 'India',
                state: 'Maharashtra',
                city: 'Mumbai',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'South Police Station',
                country: 'India',
                state: 'Delhi',
                city: 'New Delhi',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'East Police Station',
                country: 'India',
                state: 'Delhi',
                city: 'New Delhi',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Main Police Station',
                country: 'India',
                state: 'Karnataka',
                city: 'Bangalore',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'City Police Station',
                country: 'India',
                state: 'Karnataka',
                city: 'Bangalore',
                registeredBy: clerkUserId,
                isActive: true
            },
            
            // USA - with state and city
            {
                name: 'Downtown Police Department',
                country: 'United States',
                state: 'California',
                city: 'Los Angeles',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Central Police Department',
                country: 'United States',
                state: 'California',
                city: 'Los Angeles',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Main Police Department',
                country: 'United States',
                state: 'New York',
                city: 'New York',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Metro Police Station',
                country: 'United States',
                state: 'Texas',
                city: 'Houston',
                registeredBy: clerkUserId,
                isActive: true
            },
            
            // Countries without states (optional state/city)
            {
                name: 'Monaco Central Police',
                country: 'Monaco',
                state: '',
                city: '',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Monaco Security Police',
                country: 'Monaco',
                state: '',
                city: '',
                registeredBy: clerkUserId,
                isActive: true
            },
            
            // Countries with state but no city
            {
                name: 'Singapore Central Police',
                country: 'Singapore',
                state: '',
                city: '',
                registeredBy: clerkUserId,
                isActive: true
            },
            
            // Mixed scenarios - state but no city
            {
                name: 'Regional Police Station',
                country: 'India',
                state: 'Rajasthan',
                city: '',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'District Police Station',
                country: 'India',
                state: 'Gujarat',
                city: '',
                registeredBy: clerkUserId,
                isActive: true
            },
            
            // More variations for testing search
            {
                name: 'Airport Police Station',
                country: 'India',
                state: 'Maharashtra',
                city: 'Mumbai',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Railway Police Station',
                country: 'India',
                state: 'Delhi',
                city: 'New Delhi',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Highway Police Station',
                country: 'United States',
                state: 'California',
                city: 'San Francisco',
                registeredBy: clerkUserId,
                isActive: true
            },
            {
                name: 'Border Police Station',
                country: 'United States',
                state: 'Texas',
                city: 'El Paso',
                registeredBy: clerkUserId,
                isActive: true
            },
        ];

        // Insert police stations
        const result = await PoliceStation.insertMany(policeStations, { ordered: false });
        console.log(`✅ Successfully seeded ${result.length} police stations`);

        // Display summary
        console.log('\n📊 Summary:');
        const summary = await PoliceStation.aggregate([
            {
                $group: {
                    _id: { country: '$country', state: '$state', city: '$city' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.country': 1, '_id.state': 1, '_id.city': 1 } }
        ]);

        summary.forEach(item => {
            const location = [
                item._id.country,
                item._id.state || '(no state)',
                item._id.city || '(no city)'
            ].filter(Boolean).join(' > ');
            console.log(`   ${location}: ${item.count} station(s)`);
        });

        // ========== SEED USERS ==========
        console.log('\n👥 Seeding users for user search testing...');
        
        // Generate diverse user test data
        const testUsers = [
            // Common names
            { fullName: 'John Smith', email: 'john.smith@example.com', phoneNumber: '+1-555-0101' },
            { fullName: 'Jane Doe', email: 'jane.doe@test.com', phoneNumber: '+1-555-0102' },
            { fullName: 'Robert Johnson', email: 'robert.j@email.com', phoneNumber: '+1-555-0103' },
            { fullName: 'Mary Williams', email: 'mary.williams@gmail.com', phoneNumber: '+1-555-0104' },
            { fullName: 'Michael Brown', email: 'michael.brown@yahoo.com', phoneNumber: '+1-555-0105' },
            
            // Indian names
            { fullName: 'Rajesh Kumar', email: 'rajesh.kumar@example.com', phoneNumber: '+91-98765-43210' },
            { fullName: 'Priya Sharma', email: 'priya.sharma@test.com', phoneNumber: '+91-98765-43211' },
            { fullName: 'Amit Patel', email: 'amit.patel@gmail.com', phoneNumber: '+91-98765-43212' },
            { fullName: 'Sneha Reddy', email: 'sneha.reddy@yahoo.com', phoneNumber: '+91-98765-43213' },
            { fullName: 'Vikram Singh', email: 'vikram.singh@example.com', phoneNumber: '+91-98765-43214' },
            
            // Names with middle names/initials
            { fullName: 'James Michael Anderson', email: 'james.m.anderson@test.com', phoneNumber: '+1-555-0201' },
            { fullName: 'Sarah E. Martinez', email: 'sarah.martinez@email.com', phoneNumber: '+1-555-0202' },
            { fullName: 'David P. Thompson', email: 'david.thompson@example.com', phoneNumber: '+1-555-0203' },
            { fullName: 'Anjali R. Desai', email: 'anjali.desai@test.com', phoneNumber: '+91-98765-44210' },
            { fullName: 'Rohit K. Gupta', email: 'rohit.gupta@gmail.com', phoneNumber: '+91-98765-44211' },
            
            // Partial matches (for testing search)
            { fullName: 'John Anderson', email: 'john.anderson@example.com', phoneNumber: '+1-555-0301' },
            { fullName: 'Johnathon Smith', email: 'johnathon.smith@test.com', phoneNumber: '+1-555-0302' },
            { fullName: 'Johnny Depp', email: 'johnny.depp@email.com', phoneNumber: '+1-555-0303' },
            
            // Email variations
            { fullName: 'Test User One', email: 'testuser1@example.com', phoneNumber: '+1-555-0401' },
            { fullName: 'Test User Two', email: 'test.user.two@example.com', phoneNumber: '+1-555-0402' },
            { fullName: 'Test User Three', email: 'test_user_3@example.com', phoneNumber: '+1-555-0403' },
            { fullName: 'Demo Account', email: 'demo@test.com', phoneNumber: '+1-555-0501' },
            { fullName: 'Sample Person', email: 'sample.person@example.com', phoneNumber: '+1-555-0502' },
            
            // Phone number variations
            { fullName: 'Phone User One', email: 'phone1@test.com', phoneNumber: '555-1234-5678' },
            { fullName: 'Phone User Two', email: 'phone2@test.com', phoneNumber: '(555) 123-4569' },
            { fullName: 'Phone User Three', email: 'phone3@test.com', phoneNumber: '5551234570' },
            { fullName: 'Phone User Four', email: 'phone4@test.com', phoneNumber: '+1 555 123 4571' },
            { fullName: 'Phone User Five', email: 'phone5@test.com', phoneNumber: '1-555-123-4572' },
            
            // International formats
            { fullName: 'UK User', email: 'uk.user@example.co.uk', phoneNumber: '+44-20-7946-0958' },
            { fullName: 'German User', email: 'german.user@example.de', phoneNumber: '+49-30-12345678' },
            { fullName: 'French User', email: 'french.user@example.fr', phoneNumber: '+33-1-2345-6789' },
            
            // Edge cases - long names
            { fullName: 'Very Long Name Here For Testing Purposes', email: 'longname@test.com', phoneNumber: '+1-555-0601' },
            
            // Edge cases - short names
            { fullName: 'A B', email: 'a.b@test.com', phoneNumber: '+1-555-0602' },
            
            // Special characters in names (realistic)
            { fullName: "O'Brien", email: 'obrien@test.com', phoneNumber: '+1-555-0701' },
            { fullName: "D'Souza", email: 'dsouza@test.com', phoneNumber: '+1-555-0702' },
            { fullName: 'José García', email: 'jose.garcia@test.com', phoneNumber: '+1-555-0703' },
            
            // Numbers in names (some cultures)
            { fullName: 'User 123', email: 'user123@test.com', phoneNumber: '+1-555-0801' },
            { fullName: 'Test 456', email: 'test456@test.com', phoneNumber: '+1-555-0802' },
            
            // Multiple variations for scrolling test
            ...Array.from({ length: 15 }, (_, i) => ({
                fullName: `Scroll User ${i + 1}`,
                email: `scroll.user.${i + 1}@test.com`,
                phoneNumber: `+1-555-${9000 + i}`
            })),
            
            // More Indian names with variations
            { fullName: 'Arjun Menon', email: 'arjun.menon@example.com', phoneNumber: '+91-98765-45210' },
            { fullName: 'Kavya Nair', email: 'kavya.nair@test.com', phoneNumber: '+91-98765-45211' },
            { fullName: 'Rahul Iyer', email: 'rahul.iyer@gmail.com', phoneNumber: '+91-98765-45212' },
            { fullName: 'Meera Joshi', email: 'meera.joshi@yahoo.com', phoneNumber: '+91-98765-45213' },
            { fullName: 'Suresh Rao', email: 'suresh.rao@example.com', phoneNumber: '+91-98765-45214' },
        ];

        // Before seeding, check if there's a user with null governmentIdNumber blocking inserts
        // MongoDB sparse unique index only allows ONE null value, so we need to fix any null to allow new inserts
        // We'll update the existing user (not delete it) to preserve user data
        console.log(`🔍 Checking for users with null/missing governmentIdNumber...`);
        
        // Get ALL users first to debug and fix
        const allUsers = await User.find({}).select('_id email clerkUserId governmentIdNumber').lean();
        console.log(`   📊 Total users in database: ${allUsers.length}`);
        
        // Log all users to see their governmentIdNumber values
        if (allUsers.length > 0) {
            console.log(`   🔍 Current users and their governmentIdNumber:`);
            allUsers.forEach(user => {
                const govId = user.governmentIdNumber;
                const govIdType = typeof govId;
                const govIdStr = govId === null ? 'null' : govId === undefined ? 'undefined' : govId === '' ? 'empty string' : String(govId);
                console.log(`      - ${user.email || user.clerkUserId || user._id}: type=${govIdType}, value="${govIdStr}"`);
            });
        }
        
        // Check MongoDB indexes and fix any old index issues
        try {
            const indexStats = await User.collection.indexes();
            console.log(`   🔍 Checking indexes on User collection...`);
            
            // Find all indexes
            console.log(`   📊 All indexes on User collection:`);
            indexStats.forEach(idx => {
                console.log(`      - Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}`);
            });
            
            // Check for old aadharNumber index (this is causing the error)
            const oldAadharIndex = indexStats.find(idx => 
                idx.key && (idx.key.aadharNumber !== undefined || idx.name === 'aadharNumber_1')
            );
            
            if (oldAadharIndex) {
                console.log(`   ⚠️  CRITICAL: Found OLD aadharNumber index: ${oldAadharIndex.name}`);
                console.log(`   🔧 Dropping old aadharNumber index to fix the issue...`);
                try {
                    await User.collection.dropIndex(oldAadharIndex.name);
                    console.log(`   ✅ Successfully dropped old index: ${oldAadharIndex.name}`);
                } catch (dropError) {
                    console.log(`   ❌ Error dropping old index: ${dropError.message}`);
                }
            }
            
            // Check for old mobileNumber index (schema uses phoneNumber now)
            const oldMobileIndex = indexStats.find(idx => 
                idx.key && (idx.key.mobileNumber !== undefined || idx.name === 'mobileNumber_1')
            );
            
            if (oldMobileIndex) {
                console.log(`   ⚠️  CRITICAL: Found OLD mobileNumber index: ${oldMobileIndex.name}`);
                console.log(`   🔧 Dropping old mobileNumber index to fix the issue...`);
                try {
                    await User.collection.dropIndex(oldMobileIndex.name);
                    console.log(`   ✅ Successfully dropped old index: ${oldMobileIndex.name}`);
                } catch (dropError) {
                    console.log(`   ❌ Error dropping old index: ${dropError.message}`);
                }
            }
            
            // Check for correct governmentIdNumber index
            const govIdIndex = indexStats.find(idx => idx.key && idx.key.governmentIdNumber !== undefined);
            if (govIdIndex) {
                console.log(`   📊 Found governmentIdNumber index: ${JSON.stringify(govIdIndex)}`);
            } else {
                console.log(`   ⚠️  No governmentIdNumber index found - it will be created automatically`);
            }
            
            // Query using raw MongoDB to find ANY document with null governmentIdNumber
            const rawNullDocs = await User.collection.find({ 
                $or: [
                    { governmentIdNumber: null },
                    { governmentIdNumber: { $exists: false } },
                    { governmentIdNumber: "" }
                ]
            }).toArray();
            
            if (rawNullDocs.length > 0) {
                console.log(`   ⚠️  RAW MongoDB query found ${rawNullDocs.length} document(s) with null/missing/empty governmentIdNumber:`);
                rawNullDocs.forEach(doc => {
                    console.log(`      - ID: ${doc._id}, email: ${doc.email || 'N/A'}, govId: ${JSON.stringify(doc.governmentIdNumber)}`);
                });
            } else {
                console.log(`   ✅ RAW MongoDB query found NO documents with null governmentIdNumber`);
            }
        } catch (indexError) {
            console.log(`   ⚠️  Error checking index: ${indexError.message}`);
        }
        
        // Find users with null/missing/empty governmentIdNumber
        // MongoDB sparse unique index only allows ONE null value, so we must fix ALL users with null
        const blockingUsers = [];
        
        // Check each user manually - also check if govId looks suspicious
        for (const user of allUsers) {
            const govId = user.governmentIdNumber;
            // Check for null, undefined, empty string, or if it's a suspicious value
            if (govId === null || govId === undefined || govId === '' || !govId) {
                blockingUsers.push(user);
            } else {
                // Even if it has a value, if MongoDB index says null, we might need to refresh it
                // Check by trying to query with exact value
                const verify = await User.findOne({ _id: user._id, governmentIdNumber: govId }).lean();
                if (!verify) {
                    console.log(`   ⚠️  User ${user.email} has govId ${govId} but query doesn't match - might need refresh`);
                }
            }
        }
        
        // ALSO: Query MongoDB index directly to find any null values
        // Sometimes the index can have null even if the document shows a value
        try {
            const indexNulls = await User.collection.find({ governmentIdNumber: null }).toArray();
            if (indexNulls.length > 0) {
                console.log(`   ⚠️  Found ${indexNulls.length} document(s) with null in index (direct MongoDB query)`);
                indexNulls.forEach(doc => {
                    const existingBlocking = blockingUsers.find(b => b._id.toString() === doc._id.toString());
                    if (!existingBlocking) {
                        blockingUsers.push(doc);
                        console.log(`   🔍 Adding to blocking: ${doc.email || doc._id}, current govId in DB: ${doc.governmentIdNumber}`);
                    }
                });
            }
        } catch (indexError) {
            console.log(`   ⚠️  Could not query index directly: ${indexError.message}`);
        }
        
        if (blockingUsers.length > 0) {
            console.log(`⚠️  Found ${blockingUsers.length} user(s) with null/missing/empty governmentIdNumber - updating to free null slot...`);
            for (const user of blockingUsers) {
                console.log(`   🔍 Blocking user: ${user.email || user.clerkUserId || user._id}, current govId: ${user.governmentIdNumber}`);
                
                // Generate unique temporary Aadhaar for each blocking user
                const userSuffix = user._id.toString().slice(-6);
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 100000);
                const tempAadhar = `TEMP_${userSuffix}_${timestamp}_${random}`;
                
                console.log(`   🔄 Updating to: ${tempAadhar}`);
                
                const updateResult = await User.updateOne(
                    { _id: user._id },
                    { $set: { governmentIdNumber: tempAadhar } }
                );
                
                if (updateResult.modifiedCount > 0) {
                    console.log(`   ✅ Successfully updated user ${user.email || user.clerkUserId || user._id}`);
                } else {
                    console.log(`   ⚠️  Update returned modifiedCount: ${updateResult.modifiedCount} - checking if user still has null...`);
                    // Verify the update worked
                    const updatedUser = await User.findById(user._id).select('governmentIdNumber').lean();
                    if (!updatedUser.governmentIdNumber || updatedUser.governmentIdNumber === null) {
                        console.log(`   ❌ User still has null governmentIdNumber - trying direct update...`);
                        // Try a more aggressive update
                        await User.updateOne(
                            { _id: user._id },
                            { $unset: { governmentIdNumber: "" }, $set: { governmentIdNumber: tempAadhar } }
                        );
                    }
                }
            }
            
            // Re-verify all users are fixed
            console.log(`   🔍 Verifying all users are fixed...`);
            const verifyUsers = await User.find({}).select('_id email governmentIdNumber').lean();
            const stillBlocking = verifyUsers.filter(u => !u.governmentIdNumber || u.governmentIdNumber === null || u.governmentIdNumber === '');
            if (stillBlocking.length > 0) {
                console.log(`   ⚠️  Still found ${stillBlocking.length} users with null - fixing again...`);
                for (const user of stillBlocking) {
                    const fixAadhar = `FIX_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
                    await User.updateOne({ _id: user._id }, { $set: { governmentIdNumber: fixAadhar } });
                    console.log(`   ✅ Fixed user ${user.email || user._id} with ${fixAadhar}`);
                }
            } else {
                console.log(`   ✅ All users now have valid governmentIdNumber`);
            }
        } else {
            console.log(`   ✅ No users with null governmentIdNumber found`);
        }

        // Insert users (skip duplicates)
        let usersInserted = 0;
        let usersSkipped = 0;
        let usersErrored = 0;
        
        console.log(`📝 Attempting to seed ${testUsers.length} test users...`);
        
        for (const userData of testUsers) {
            // Declare variables outside try block for catch block access
            let clerkUserId;
            let safeGovId;
            let updateFields;
            
            try {
                // Check if user with same email OR phone number already exists
                const existingByEmail = await User.findOne({ email: userData.email }).lean();
                const existingByPhone = userData.phoneNumber 
                    ? await User.findOne({ phoneNumber: userData.phoneNumber }).lean()
                    : null;
                
                if (existingByEmail || existingByPhone) {
                    usersSkipped++;
                    if (usersSkipped <= 3) {
                        const reason = existingByEmail ? 'email' : 'phone';
                        console.log(`   ⏭️  Skipping ${userData.email} (duplicate ${reason})`);
                    }
                    continue;
                }

                // Generate unique clerkUserId for test users (format: test_user_${timestamp}_${random})
                const userIdTimestamp = Date.now();
                const userIdRandom = Math.floor(Math.random() * 10000);
                clerkUserId = `test_user_${userIdTimestamp}_${userIdRandom}`;

                // Generate unique phone number if it might conflict (phoneNumber is unique sparse index)
                let phoneNumber = userData.phoneNumber;
                if (phoneNumber && phoneNumber.trim()) {
                    // Check if phone already exists
                    const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() }).lean();
                    if (phoneExists) {
                        // Make it unique by appending timestamp and random
                        const phoneTimestamp = Date.now();
                        const phoneRandom = Math.floor(Math.random() * 10000);
                        phoneNumber = `${phoneNumber.trim()}_${phoneTimestamp}_${phoneRandom}`;
                    } else {
                        phoneNumber = phoneNumber.trim();
                    }
                } else {
                    phoneNumber = undefined; // Don't set if empty/null
                }

                // Build user object according to User schema requirements
                // Required fields: clerkUserId, email
                // Optional but we'll set: fullName, governmentIdNumber, role, onboardingCompleted, location fields
                
                // Generate unique Aadhaar-like format: "AADHAR" followed by timestamp + random digits
                // Format must match: letters, numbers, dashes, spaces (6-30 chars)
                // Use timestamp + random to ensure absolute uniqueness
                const aadharTimestamp = Date.now();
                const aadharRandom = Math.floor(Math.random() * 1000000000);
                let finalAadhar = `AADHAR${aadharTimestamp}${aadharRandom}`.substring(0, 30); // Ensure max length 30
                
                // Verify the Aadhaar number doesn't already exist
                const existingAadhar = await User.findOne({ governmentIdNumber: finalAadhar }).lean();
                if (existingAadhar) {
                    // Retry with more randomness
                    finalAadhar = `AADHAR${Date.now()}${Math.floor(Math.random() * 10000000000)}`.substring(0, 30);
                    console.log(`   ⚠️  Aadhaar collision for ${userData.email}, retrying with: ${finalAadhar}`);
                }
                
                // Final validation - ensure finalAadhar is valid before building object
                if (!finalAadhar || finalAadhar.trim() === '' || finalAadhar === null || finalAadhar === undefined) {
                    throw new Error(`CRITICAL: finalAadhar is invalid for ${userData.email}: ${finalAadhar}`);
                }
                
                // Build user object matching the User schema exactly
                // Based on schema: clerkUserId (required), email (required), governmentIdNumber (optional, unique sparse)
                // IMPORTANT: Do NOT use null or undefined - always use a valid string
                const userObject = {
                    clerkUserId: clerkUserId,
                    email: userData.email.trim(),
                    governmentIdNumber: String(finalAadhar).trim(), // Force to string and trim - NEVER null
                    role: 'general_user',
                    onboardingCompleted: true,
                    country: 'India',
                    state: 'Maharashtra',
                    city: 'Mumbai',
                    address: '',
                    pincode: ''
                };
                
                // Add optional fields only if they have values
                if (userData.fullName && userData.fullName.trim()) {
                    userObject.fullName = userData.fullName.trim();
                }
                
                // Only add phoneNumber if it exists and is valid (sparse unique index)
                // Don't set it at all if null/empty - let mongoose handle default
                if (phoneNumber && phoneNumber.trim()) {
                    userObject.phoneNumber = phoneNumber.trim();
                }
                
                // Final validation before insert - double check no nulls
                if (!userObject.governmentIdNumber || userObject.governmentIdNumber.trim() === '') {
                    throw new Error(`CRITICAL: governmentIdNumber is empty for ${userData.email}`);
                }
                if (userObject.governmentIdNumber === null || userObject.governmentIdNumber === undefined) {
                    throw new Error(`CRITICAL: governmentIdNumber is null/undefined for ${userData.email}`);
                }
                if (!userObject.clerkUserId) {
                    throw new Error(`CRITICAL: clerkUserId is missing for ${userData.email}`);
                }
                if (!userObject.email) {
                    throw new Error(`CRITICAL: email is missing for ${userData.email}`);
                }
                
                // Final check - ensure governmentIdNumber is absolutely not null/undefined/empty
                safeGovId = String(finalAadhar).trim();
                if (!safeGovId || safeGovId === 'null' || safeGovId === 'undefined') {
                    throw new Error(`CRITICAL: Safe govId is invalid: ${safeGovId} for ${userData.email}`);
                }
                
                // Build update document matching the application pattern (user-auth.js routes)
                // Use findOneAndUpdate with upsert (like webhook and profile routes do)
                updateFields = {
                    governmentIdNumber: safeGovId, // Always set - never null
                    role: 'general_user',
                    onboardingCompleted: true,
                    country: 'India',
                    state: 'Maharashtra',
                    city: 'Mumbai',
                    address: '',
                    pincode: ''
                };
                
                // Add optional fields only if they exist (matching app pattern)
                if (userData.fullName && userData.fullName.trim()) {
                    updateFields.fullName = userData.fullName.trim();
                }
                if (phoneNumber && phoneNumber.trim()) {
                    updateFields.phoneNumber = phoneNumber.trim();
                }
                
                // Final validation
                if (!updateFields.governmentIdNumber || updateFields.governmentIdNumber === null || updateFields.governmentIdNumber === undefined) {
                    throw new Error(`FINAL CHECK FAILED: governmentIdNumber is invalid for ${userData.email}`);
                }
                
                // Log before insert
                console.log(`   🔍 About to insert: ${userData.email}, govId: ${updateFields.governmentIdNumber.substring(0, 25)}...`);
                
                // CRITICAL: Check for null one more time before EACH insert
                const nullCheck = await User.collection.findOne({ governmentIdNumber: null });
                if (nullCheck) {
                    console.log(`   ⚠️  EMERGENCY: Found null in index before insert for ${userData.email}`);
                    
                    // Fix using raw MongoDB - force update all nulls
                    const emergencyFix = `EMERG_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
                    const fixResult = await User.collection.updateMany(
                        { governmentIdNumber: null },
                        { $set: { governmentIdNumber: emergencyFix } }
                    );
                    console.log(`   ✅ Fixed ${fixResult.modifiedCount} document(s) with: ${emergencyFix}`);
                    
                    // Wait for index update
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // Use findOneAndUpdate with upsert (matching application pattern exactly)
                // This is how the webhook and profile routes create users
                // NOTE: onboardingCompleted is in $set (not $setOnInsert) to avoid conflict
                await User.findOneAndUpdate(
                    { clerkUserId: clerkUserId },
                    { 
                        $set: updateFields,
                        $setOnInsert: {
                            clerkUserId: clerkUserId,
                            email: userData.email.trim()
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                usersInserted++;
                if (usersInserted <= 5) {
                    console.log(`   ✅ Created: ${userData.fullName} (${userData.email})`);
                }
            } catch (error) {
                usersErrored++;
                if (error.code === 11000) {
                    // Duplicate key error - log full error details
                    usersSkipped++;
                    
                    // Log full error for first few to understand the issue
                    if (usersSkipped <= 3) {
                        console.log(`   🔍 FULL ERROR DETAILS for ${userData.email}:`);
                        console.log(`      Error code: ${error.code}`);
                        console.log(`      Error keyPattern:`, error.keyPattern);
                        console.log(`      Error keyValue:`, error.keyValue);
                        console.log(`      Error message:`, error.message);
                    }
                    
                    const dupField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
                    const dupValue = error.keyValue ? error.keyValue[dupField] : 'unknown';
                    
                    if (usersSkipped <= 5) {
                        console.log(`   ⚠️  Duplicate ${dupField} error for ${userData.email}: ${dupValue}`);
                    }
                    
                    // Special handling if governmentIdNumber/aadharNumber has null in keyValue
                    const errorField = error.keyPattern ? Object.keys(error.keyPattern)[0] : null;
                    if (error.keyValue && (error.keyValue.governmentIdNumber === null || error.keyValue.aadharNumber === null || errorField === 'governmentIdNumber' || errorField === 'aadharNumber')) {
                        const reportedValue = safeGovId || 'NOT_SET_YET';
                        console.log(`   ⚠️  CRITICAL: ${errorField || 'governmentIdNumber'} is null in error but we set it to: ${reportedValue}`);
                        // Try to fix the existing null document
                        try {
                            const fixNull = await User.collection.updateMany(
                                { governmentIdNumber: null },
                                { $set: { governmentIdNumber: `AUTO_FIX_${Date.now()}_${Math.floor(Math.random() * 1000000)}` } }
                            );
                            if (fixNull.modifiedCount > 0) {
                                console.log(`   ✅ Fixed ${fixNull.modifiedCount} null document(s) - retrying insert...`);
                                // Only retry if we have the necessary variables
                                if (clerkUserId && updateFields && safeGovId) {
                                    await User.findOneAndUpdate(
                                        { clerkUserId: clerkUserId },
                                        { 
                                            $set: updateFields,
                                            $setOnInsert: {
                                                clerkUserId: clerkUserId,
                                                email: userData.email.trim()
                                            }
                                        },
                                        { upsert: true, new: true, setDefaultsOnInsert: true }
                                    );
                                    usersInserted++;
                                    usersSkipped--;
                                    usersErrored--;
                                    if (usersInserted <= 5) {
                                        console.log(`   ✅ Created (after retry): ${userData.fullName} (${userData.email})`);
                                    }
                                    continue;
                                } else {
                                    console.log(`   ⚠️  Cannot retry - variables not set`);
                                }
                            }
                        } catch (retryError) {
                            console.log(`   ❌ Retry failed: ${retryError.message}`);
                        }
                    }
                } else {
                    console.error(`   ❌ Error inserting user ${userData.email}:`, error.message);
                    console.error(`   Full error:`, error);
                }
            }
        }

        console.log(`\n✅ User seeding complete:`);
        console.log(`   ✅ Inserted: ${usersInserted}`);
        console.log(`   ⏭️  Skipped: ${usersSkipped} (already exist)`);
        if (usersErrored > usersSkipped) {
            console.log(`   ❌ Errors: ${usersErrored - usersSkipped}`);
        }

        console.log('\n📊 User Summary:');
        const totalTestUsers = await User.countDocuments({ 
            email: { $regex: /@(test|example)\./ } 
        });
        console.log(`   Total test users in DB: ${totalTestUsers}`);
        
        const userSummary = await User.aggregate([
            { $match: { email: { $regex: /@(test|example)\./ } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        userSummary.forEach(item => {
            console.log(`   ${item._id || 'unknown'}: ${item.count} user(s)`);
        });
        
        if (totalTestUsers === 0 && usersInserted === 0) {
            console.log('\n💡 Tip: Use --clear-users flag to remove existing test users first, then re-run to seed fresh users.');
        }

        console.log('\n✨ Seeding completed successfully!');
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        
        // If it's a duplicate key error, that's okay
        if (error.code === 11000) {
            console.log('⚠️  Some data already exists (duplicate key error). This is normal if running multiple times.');
            console.log('💡 Use --clear flag to remove existing stations first: node scripts/seedPoliceStations.js --clear');
        } else {
            console.error('💡 Please check your MongoDB connection and try again');
        }
        
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run the seeding function
seedTestData();

