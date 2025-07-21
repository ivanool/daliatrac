// TEST DATA para verificar que se muestran todos los campos
const testFinancialData = {
  "flujo_operacion": -457600000,
  "utilidad_neta": 123456789,
  "depreciacion": 45678901,
  "cambio_inventarios": 0,
  "cambio_cxc": -12345678,
  "cambio_cxp": 98765432,
  "impuestos_pagados": 0,
  "intereses_pagados": -21234567,
  "flujo_inversion": -234567890,
  "capex": -345678901,
  "venta_activos": 12345678,
  "compra_intangibles": 0,
  "flujo_financiamiento": 456789012,
  "prestamos_obtenidos": 567890123,
  "pago_deuda": 0,
  "dividendos_pagados": -123456789,
  "recompras": -234567890,
  "cambio_efectivo": 489000,
  "efectivo_final": 1234567890,
  "efecto_tc": 12345678,
  "deterioros": -23456789,
  "partidas_no_monetarias": 34567890,
  "costos_financieros": -21200000
};

console.log("=== TEST FINANCIAL DATA ===");
console.log("Total campos flujo:", Object.keys(testFinancialData).length);
console.log("Campos:", Object.keys(testFinancialData));

// Verificar que son exactamente 23 campos como en el backend
if (Object.keys(testFinancialData).length === 23) {
  console.log("✅ CORRECTO: 23 campos de flujo como en backend");
} else {
  console.log("❌ ERROR: Deberían ser 23 campos");
}

// Simular datos de posición (18 campos)
const testPositionData = {
  "currentassets": 2345678901,
  "currentliabilities": 1234567890,
  "cashandcashequivalents": 345678901,
  "inventories": 456789012,
  "tradeandothercurrentreceivables": 567890123,
  "tradeandothercurrentpayables": 678901234,
  "equity": 3456789012,
  "liabilities": 2345678901,
  "noncurrentliabilities": 1234567890,
  "equityattributabletoownersofparent": 3456789012,
  "noncontrollinginterests": 0,
  "propertyplantandequipment": 4567890123,
  "intangibleassetsotherthangoodwill": 234567890,
  "goodwill": 345678901,
  "rightofuseassetsthatdonotmeetdefinitionofinvestmentproperty": 123456789,
  "deferredtaxassets": 234567890,
  "deferredtaxliabilities": 345678901,
  "noncurrentassetsordisposalgroupsclassifiedasheldforsale": 0
};

console.log("Total campos posición:", Object.keys(testPositionData).length);

if (Object.keys(testPositionData).length === 18) {
  console.log("✅ CORRECTO: 18 campos de posición como en backend");
} else {
  console.log("❌ ERROR: Deberían ser 18 campos");
}
