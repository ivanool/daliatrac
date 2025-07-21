#!/usr/bin/env node

console.log("=== TESTING BUILD ===");
console.log("1. Verificando que no hay errores de imports...");

try {
  // Verificar que no hay problemas con recharts
  const fs = require('fs');
  const stockChartContent = fs.readFileSync('./src/components/StockChart.tsx', 'utf8');
  
  if (stockChartContent.includes('recharts')) {
    console.error("❌ ERROR: StockChart todavía tiene imports de recharts!");
    process.exit(1);
  }
  
  if (!stockChartContent.includes('@nivo/line')) {
    console.error("❌ ERROR: StockChart no tiene el import correcto de @nivo/line!");
    process.exit(1);
  }
  
  console.log("✅ StockChart usa @nivo/line correctamente");
  
  // Verificar FinancialTable
  const financialTableContent = fs.readFileSync('./src/components/FinancialTable.tsx', 'utf8');
  
  if (!financialTableContent.includes('console.log')) {
    console.error("❌ ERROR: FinancialTable no tiene logs de debug!");
    process.exit(1);
  }
  
  console.log("✅ FinancialTable tiene logs de debug");
  
  console.log("✅ Todas las verificaciones pasaron!");
  
} catch (error) {
  console.error("❌ ERROR:", error.message);
  process.exit(1);
}
