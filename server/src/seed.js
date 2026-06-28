import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import supabase from './config/supabase.js';
dotenv.config();

async function seed() {
  console.log('🌱 Seeding InternHub database...');

  const users = [
    {
      username: 'admin',
      password: 'Admin@123',
      full_name: 'Admin User',
      role: 'admin',
      company: 'si_placements',
      department: 'Management',
      batch_start: '2024-06-01',
      batch_end: '2024-07-31',
    },
    {
      username: 'priya_it',
      password: 'Intern@123',
      full_name: 'Priya Sharma',
      role: 'it_intern',
      company: 'site4people',
      department: 'Web Development',
      batch_start: '2024-06-01',
      batch_end: '2024-07-31',
    },
    {
      username: 'arjun_bd',
      password: 'Intern@123',
      full_name: 'Arjun Mehta',
      role: 'bd_intern',
      company: 'site4people',
      department: 'Business Development',
      batch_start: '2024-06-01',
      batch_end: '2024-07-31',
    },
    {
      username: 'neha_rec',
      password: 'Intern@123',
      full_name: 'Neha Gupta',
      role: 'recruitment_intern',
      company: 'si_placements',
      department: 'Recruitment',
      batch_start: '2024-06-01',
      batch_end: '2024-07-31',
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const { error } = await supabase.from('users').upsert({
      username: u.username,
      password_hash: hash,
      full_name: u.full_name,
      role: u.role,
      company: u.company,
      department: u.department,
      batch_start: u.batch_start,
      batch_end: u.batch_end,
      is_active: true,
    }, { onConflict: 'username' });

    if (error) console.error(`Error seeding ${u.username}:`, error.message);
    else console.log(`✅ Created user: ${u.username} / ${u.password}`);
  }

  // Seed announcement
  const { data: adminUser } = await supabase.from('users').select('id').eq('username', 'admin').single();
  if (adminUser) {
    await supabase.from('announcements').insert({
      title: '🎉 Welcome to InternHub!',
      content: 'Welcome to InternHub — your daily operations hub. Check in every day by 10 AM, submit your daily report before 7 PM. Reach out to admin for any queries.',
      created_by: adminUser.id,
    });
    console.log('✅ Welcome announcement created');
  }

  console.log('\n🚀 Seeding complete!');
  console.log('Login credentials:');
  console.log('  Admin:       admin / Admin@123');
  console.log('  IT Intern:   priya_it / Intern@123');
  console.log('  BD Intern:   arjun_bd / Intern@123');
  console.log('  Rec Intern:  neha_rec / Intern@123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
