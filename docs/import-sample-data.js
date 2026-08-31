/**
 * Import Sample Data Script
 * Run this in browser console when logged in as admin to populate sample data
 */

const sampleData = [
  { date: "2024-01-01", price: 82.50, quantity: 1520, source: "กรมปศุสัตว์" },
  { date: "2024-01-02", price: 83.00, quantity: 1505, source: "กรมปศุสัตว์" },
  { date: "2024-01-03", price: 83.50, quantity: 1490, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-04", price: 84.00, quantity: 1485, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-05", price: 84.50, quantity: 1500, source: "กรมปศุสัตว์" },
  { date: "2024-01-08", price: 85.00, quantity: 1510, source: "กรมปศุสัตว์" },
  { date: "2024-01-09", price: 85.50, quantity: 1495, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-10", price: 86.00, quantity: 1480, source: "กรมปศุสัตว์" },
  { date: "2024-01-11", price: 86.50, quantity: 1470, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-12", price: 87.00, quantity: 1460, source: "กรมปศุสัตว์" },
  { date: "2024-01-15", price: 87.50, quantity: 1455, source: "กรมปศุสัตว์" },
  { date: "2024-01-16", price: 88.00, quantity: 1450, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-17", price: 87.50, quantity: 1465, source: "กรมปศุสัตว์" },
  { date: "2024-01-18", price: 87.00, quantity: 1475, source: "สมาคมผู้เลี้ยงสุกรแห่งชาติ" },
  { date: "2024-01-19", price: 86.50, quantity: 1485, source: "กรมปศุสัตว์" }
];

async function importSampleData() {
  if (!window.db) {
    console.error('Firebase not initialized');
    return;
  }

  console.log('Starting import of', sampleData.length, 'records...');
  
  for (let i = 0; i < sampleData.length; i++) {
    const item = {
      ...sampleData[i],
      addedAt: new Date().toISOString()
    };
    
    try {
      await window.db.ref('pork_price_data').push(item);
      console.log(`✅ Imported ${i + 1}/${sampleData.length}: ${item.date} - ${item.price} บาท`);
    } catch (error) {
      console.error(`❌ Failed to import ${item.date}:`, error);
    }
  }
  
  console.log('✅ Import complete!');
  alert('นำเข้าข้อมูลตัวอย่างสำเร็จ ' + sampleData.length + ' รายการ');
}

// Run import
importSampleData();
