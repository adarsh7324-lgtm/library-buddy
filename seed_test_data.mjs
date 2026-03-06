import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://olqwlikslvyvypnrmlcb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scXdsaWtzbHZ5dnlwbnJtbGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTk0MjIsImV4cCI6MjA4ODM5NTQyMn0.FZVqnkB6tkqGJO5MQNQZJ6bAlt73sDSccKTWC87m3mw';
const supabase = createClient(supabaseUrl, supabaseKey);

const activeLibraryId = 'demolibrary';

function generateRandomMembers(count) {
    const members = [];
    const start = Date.now();
    for (let i = 0; i < count; i++) {
        const isSpecialCase = i % 5 === 0;
        const months = isSpecialCase ? 0 : Math.floor(Math.random() * 6) + 1;
        const customDays = isSpecialCase ? Math.floor(Math.random() * 15) + 1 : null;

        // Some are expired, some are active, some are expiring soon
        const statusRand = Math.random();
        let status = 'Active';
        let daysOffset = 0;
        if (statusRand < 0.2) {
            status = 'Expired';
            daysOffset = -Math.floor(Math.random() * 30) - 1;
        } else if (statusRand < 0.4) {
            status = 'Expiring Soon';
            daysOffset = Math.floor(Math.random() * 7);
        } else {
            status = 'Active';
            daysOffset = Math.floor(Math.random() * 60) + 8;
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysOffset);

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - (months || 1));

        members.push({
            libraryId: activeLibraryId,
            fullName: `Test Member ${i + 1}`,
            phone: `+91 ${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
            countryCode: '+91',
            address: `Random Street ${i + 1}, Sample City`,
            idProofNumber: `ID-${1000 + i}`,
            months: months,
            customDays: customDays,
            feesPaid: (months || 1) * 500,
            startDate: startDate.toISOString().split('T')[0],
            expiryDate: expiryDate.toISOString().split('T')[0],
            status: status,
            seatNumber: `S${i + 1}`,
            startTime: '09:00',
            endTime: '18:00',
            lockerFacility: Math.random() > 0.5
        });
    }
    return members;
}

async function run() {
    console.log('Generating 25 mock members...');
    const membersData = generateRandomMembers(25);

    console.log('Inserting members into Supabase...');
    const { data: insertedMembers, error: membersError } = await supabase
        .from('members')
        .insert(membersData)
        .select();

    if (membersError) {
        console.error('Error inserting members:', membersError);
        return;
    }

    console.log(`Successfully added ${insertedMembers.length} members.`);

    console.log('Generating sample payments for these members...');
    const paymentsData = insertedMembers.map((member, idx) => ({
        libraryId: activeLibraryId,
        memberId: member.id,
        amount: member.feesPaid,
        months: member.months,
        customDays: member.customDays,
        date: member.startDate,
        note: `Initial registration payment #${idx + 1}`
    }));

    const { data: insertedPayments, error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentsData)
        .select();

    if (paymentsError) {
        console.error('Error inserting payments:', paymentsError);
        return;
    }

    console.log(`Successfully added ${insertedPayments.length} corresponding payments.`);
    console.log('Data flow simulation completed!');
}

run();
