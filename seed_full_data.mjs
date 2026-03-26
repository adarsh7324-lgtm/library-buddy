import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const LIB_ID = '672f68ab-3938-402c-a80f-f016b04b4aa4';

// Helper Data
const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Ishaan', 'Aaryan', 'Krishna', 'Ishan', 'Siddharth', 'Aryan', 'Anay', 'Reyansh', 'Ayush', 'Rohan', 'Kabir', 'Arav', 'Arnav', 'Vivaan', 'Advait', 'Saanvi', 'Ananya', 'Aadhya', 'Aavya', 'Anika', 'Diya', 'Ishani', 'Myra', 'Navya', 'Pia', 'Sia', 'Vanya', 'Zoya', 'Kyra', 'Riya', 'Kiara', 'Inaya', 'Aria', 'Sana', 'Ira'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Mehta', 'Jain', 'Goel', 'Agarwal', 'Bansal', 'Chaudhary', 'Yadav', 'Maurya', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Chatterjee', 'Mukherjee', 'Dutta', 'Das', 'Roy', 'Sen', 'Ghosal', 'Biswas', 'Deshmukh', 'Kulkarni', 'Joshi', 'Pandey', 'Mishra'];
const indianCities = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana'];
const targetExams = ['UPSC Civil Services', 'SSC CGL', 'NEET UG', 'JEE Main', 'IBPS PO', 'CAT', 'GATE', 'RRB NTPC', 'CLAT', 'NDA', 'Chartered Accountancy', 'State PCS', 'UGC NET'];
const expenseCategories = ['Electricity', 'Internet', 'Stationery', 'Maintenance', 'Printing', 'Miscellaneous', 'Rent', 'Water', 'Cleaning Supplies', 'Tea/Coffee'];
const staffRoles = ['Librarian', 'Assistant Librarian', 'Receptionist', 'Cleaner', 'Security Guard', 'Accountant', 'System Admin'];

// Utility Functions
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const formatYMD = (date) => date.toISOString().split('T')[0];

function generateMember(i) {
    const firstName = getRandom(firstNames);
    const lastName = getRandom(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const phone = getRandomInt(6000000000, 9999999999).toString();
    const address = `House ${getRandomInt(1, 999)}, ${getRandomInt(1, 20)}th Main, ${getRandom(indianCities)}`;
    const idProofNumber = Math.random() > 0.5 
        ? `${getRandomInt(1000, 9999)} ${getRandomInt(1000, 9999)} ${getRandomInt(1000, 9999)}` // Aadhar
        : `PAN${getRandomInt(10000, 99999)}X`; // PAN
    
    const shifts = ['Morning', 'Afternoon', 'Evening', 'Night', 'Full'];
    const shift = getRandom(shifts);
    let startTime, endTime;
    switch(shift) {
        case 'Morning': startTime = '06:00'; endTime = '12:00'; break;
        case 'Afternoon': startTime = '12:00'; endTime = '18:00'; break;
        case 'Evening': startTime = '18:00'; endTime = '00:00'; break;
        case 'Night': startTime = '00:00'; endTime = '06:00'; break;
        default: startTime = '08:00'; endTime = '20:00'; // Full
    }

    const months = Math.random() > 0.15 ? getRandomInt(1, 6) : null;
    const customDays = months === null ? getRandomInt(10, 25) : null;
    
    // Dates staggered over last 18 months
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - getRandomInt(0, 540));
    
    const expiryDate = new Date(startDate);
    if (months) expiryDate.setMonth(expiryDate.getMonth() + months);
    else expiryDate.setDate(expiryDate.getDate() + customDays);

    const statusObj = determineStatus(expiryDate);

    return {
        libraryId: LIB_ID,
        fullName,
        phone,
        countryCode: '+91',
        address,
        idProofNumber,
        shift,
        startTime,
        endTime,
        seatNumber: `${getRandom(['A', 'B', 'C', 'D'])}${getRandomInt(1, 75)}`,
        months,
        customDays,
        startDate: formatYMD(startDate),
        expiryDate: formatYMD(expiryDate),
        status: statusObj.status,
        targetExam: getRandom(targetExams),
        lockerFacility: Math.random() > 0.4,
        registrationFee: getRandom([200, 500]),
        discountAmount: getRandom([0, 0, 0, 50, 100, 200, 500]),
        feesPaid: 0, // Will be updated by payments
        photoUrl: null
    };
}

function determineStatus(expiryDate) {
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'Expired' };
    if (diffDays <= 7) return { status: 'Expiring Soon' };
    return { status: 'Active' };
}

async function run() {
    console.log('--- Library Buddy Dummy Data Generator ---');
    console.log(`Library ID: ${LIB_ID}`);

    // 1. Check existing count
    const { count, error: countError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('libraryId', LIB_ID);

    if (countError) {
        console.error('Error checking existing data:', countError);
        return;
    }

    if (count > 50) {
        console.warn(`Found ${count} members already. Aborting to avoid duplicates. Delete them manually if you want a clean seed.`);
        return;
    }

    // 2. Generate and Insert Members
    console.log('Generating 300 members...');
    const membersData = [];
    for (let i = 0; i < 300; i++) {
        membersData.push(generateMember(i));
    }

    console.log('Inserting members (in batches of 100)...');
    const insertedMembers = [];
    for (let i = 0; i < membersData.length; i += 100) {
        const batch = membersData.slice(i, i + 100);
        const { data, error } = await supabase.from('members').insert(batch).select();
        if (error) {
            console.error(`Error inserting batch ${i/100}:`, error);
            return;
        }
        insertedMembers.push(...data);
    }
    console.log(`Successfully added ${insertedMembers.length} members.`);

    // 3. Generate Payments
    console.log('Generating payments (3-5 per member)...');
    const paymentsData = [];
    for (const member of insertedMembers) {
        const numPayments = getRandomInt(3, 5);
        let lastDate = new Date(member.startDate);
        
        for (let p = 0; p < numPayments; p++) {
            const isAdmission = p === 0;
            const pmDate = new Date(lastDate);
            if (!isAdmission) {
                // Stagger subsequent payments by 1-3 months
                pmDate.setMonth(pmDate.getMonth() + getRandomInt(1, 3));
            }

            // If date is in future, don't add (realistic)
            if (pmDate > new Date()) continue;

            const months = member.months || 1;
            const amount = (months * 500) + (isAdmission ? member.registrationFee : 0) - (isAdmission ? member.discountAmount : 0);
            
            paymentsData.push({
                libraryId: LIB_ID,
                memberId: member.id,
                amount: Math.max(0, amount),
                months: member.months,
                customDays: member.customDays,
                date: formatYMD(pmDate),
                note: isAdmission ? 'Initial Admission Fee' : `Renewal Payment #${p}`,
                paymentMode: getRandom(['Cash', 'UPI', 'UPI', 'Card']), // Weighted towards UPI
                dueAmount: Math.random() > 0.8 ? getRandom([100, 200, 500]) : 0,
                advancedAmount: Math.random() > 0.9 ? getRandom([100, 200]) : 0
            });
            
            lastDate = pmDate;
        }
    }

    console.log(`Inserting ${paymentsData.length} payments (in batches of 200)...`);
    for (let i = 0; i < paymentsData.length; i += 200) {
        const batch = paymentsData.slice(i, i + 200);
        const { error } = await supabase.from('payments').insert(batch);
        if (error) {
            console.error('Error inserting payments batch:', error);
            // Non-fatal, continue
        }
    }

    // 4. Staff
    console.log('Generating 20 staff records...');
    const staffData = [];
    for (let i = 0; i < 20; i++) {
        const joiningDate = new Date();
        joiningDate.setMonth(joiningDate.getMonth() - getRandomInt(6, 36));
        
        staffData.push({
            libraryId: LIB_ID,
            fullName: `${getRandom(firstNames)} ${getRandom(lastNames)}`,
            role: getRandom(staffRoles),
            phone: getRandomInt(6000000000, 9999999999).toString(),
            countryCode: '+91',
            address: `Staff Qtr ${getRandomInt(1, 50)}, ${getRandom(indianCities)}`,
            idProofNumber: `EMP-${getRandomInt(1000, 9999)}`,
            salary: getRandom([8000, 12000, 15000, 25000, 35000]),
            joiningDate: formatYMD(joiningDate),
            status: Math.random() > 0.1 ? 'Active' : 'Inactive',
            photoUrl: null
        });
    }
    const { data: insertedStaff, error: staffError } = await supabase.from('staff').insert(staffData).select();
    if (staffError) console.error('Error inserting staff:', staffError);
    else {
        console.log(`Added ${insertedStaff.length} staff members.`);
        
        // 5. Staff Salary Payments (3-4 per staff)
        console.log('Generating staff salary payments...');
        const salaryPayments = [];
        for (const s of insertedStaff) {
            const numSalaries = getRandomInt(3, 4);
            for (let j = 0; j < numSalaries; j++) {
                const payDate = new Date();
                payDate.setDate(25); // Paid on 25th
                payDate.setMonth(payDate.getMonth() - j);
                
                if (payDate < new Date(s.joiningDate)) continue;

                salaryPayments.push({
                    libraryId: LIB_ID,
                    staffId: s.id,
                    amount: s.salary,
                    date: formatYMD(payDate),
                    status: 'Paid',
                    paymentMode: getRandom(['Cash', 'UPI']),
                    note: `Monthly salary - ${payDate.toLocaleString('default', { month: 'long' })} ${payDate.getFullYear()}`
                });
            }
        }
        await supabase.from('staff_salary_payments').insert(salaryPayments);
        console.log(`Added ${salaryPayments.length} salary payments.`);
    }

    // 6. Expenses
    console.log('Generating ~60 expenses over last 12 months...');
    const expensesData = [];
    for (let i = 0; i < 60; i++) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() - getRandomInt(1, 365));
        
        const category = getRandom(expenseCategories);
        let amount = getRandomInt(100, 2000);
        if (category === 'Rent') amount = getRandom([15000, 20000, 25000]);
        if (category === 'Electricity') amount = getRandomInt(2000, 8000);

        expensesData.push({
            libraryId: LIB_ID,
            category,
            amount,
            date: formatYMD(expDate),
            note: `${category} payment for period around ${formatYMD(expDate)}`
        });
    }
    await supabase.from('expenses').insert(expensesData);
    console.log('Added 60 expense records.');

    console.log('\nDone! Data seeding completed successfully.');
}

run();
