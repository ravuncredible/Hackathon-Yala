// AI Resource Prediction Engine
// Predicts hospital resource needs based on triage patient counts

export interface TriageSummary {
  red: number;
  yellow: number;
  green: number;
  total: number;
}

export interface ResourcePrediction {
  icu_beds: number;
  or_rooms: number;
  ventilators: number;
  blood_o_units: number;
  blood_a_units: number;
  blood_b_units: number;
  surgeons_needed: number;
  doctors_needed: number;
  estimated_ambulances: number;
}

export interface PredictionResult {
  prediction: ResourcePrediction;
  reasoning: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
}

// Resource multipliers based on medical statistics
const RESOURCE_MULTIPLIERS = {
  red: {
    icu_probability: 0.85,     // 85% of red patients need ICU
    or_probability: 0.60,      // 60% need surgery
    ventilator_probability: 0.70,
    blood_units_avg: 4,        // Average blood units per red patient
    surgeon_ratio: 0.5,        // 1 surgeon per 2 red patients
    doctor_ratio: 1.0,         // 1 doctor per red patient
  },
  yellow: {
    icu_probability: 0.15,
    or_probability: 0.20,
    ventilator_probability: 0.10,
    blood_units_avg: 1,
    surgeon_ratio: 0.15,
    doctor_ratio: 0.5,
  },
  green: {
    icu_probability: 0.02,
    or_probability: 0.05,
    ventilator_probability: 0.01,
    blood_units_avg: 0,
    surgeon_ratio: 0.0,
    doctor_ratio: 0.2,
  },
};

export function predictResources(summary: TriageSummary): PredictionResult {
  const { red, yellow, green, total } = summary;

  if (total === 0) {
    return {
      prediction: {
        icu_beds: 0, or_rooms: 0, ventilators: 0,
        blood_o_units: 0, blood_a_units: 0, blood_b_units: 0,
        surgeons_needed: 0, doctors_needed: 0, estimated_ambulances: 0,
      },
      reasoning: ['ยังไม่มีข้อมูลผู้บาดเจ็บ'],
      urgency_level: 'low',
      confidence: 0,
    };
  }

  // Calculate resource predictions
  const icu_beds = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.icu_probability +
    yellow * RESOURCE_MULTIPLIERS.yellow.icu_probability +
    green * RESOURCE_MULTIPLIERS.green.icu_probability
  );

  const or_rooms = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.or_probability +
    yellow * RESOURCE_MULTIPLIERS.yellow.or_probability +
    green * RESOURCE_MULTIPLIERS.green.or_probability
  );

  const ventilators = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.ventilator_probability +
    yellow * RESOURCE_MULTIPLIERS.yellow.ventilator_probability +
    green * RESOURCE_MULTIPLIERS.green.ventilator_probability
  );

  const total_blood = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.blood_units_avg +
    yellow * RESOURCE_MULTIPLIERS.yellow.blood_units_avg
  );

  // Distribute blood by common type ratios (O:38%, A:30%, B:25%, AB:7%)
  const blood_o_units = Math.ceil(total_blood * 0.45); // Extra O for emergency universal
  const blood_a_units = Math.ceil(total_blood * 0.30);
  const blood_b_units = Math.ceil(total_blood * 0.25);

  const surgeons_needed = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.surgeon_ratio +
    yellow * RESOURCE_MULTIPLIERS.yellow.surgeon_ratio
  );

  const doctors_needed = Math.ceil(
    red * RESOURCE_MULTIPLIERS.red.doctor_ratio +
    yellow * RESOURCE_MULTIPLIERS.yellow.doctor_ratio +
    green * RESOURCE_MULTIPLIERS.green.doctor_ratio
  );

  const estimated_ambulances = Math.ceil(total / 2); // ~2 patients per ambulance

  // Determine urgency level
  let urgency_level: PredictionResult['urgency_level'] = 'low';
  if (red >= 5 || total >= 20) urgency_level = 'critical';
  else if (red >= 3 || total >= 10) urgency_level = 'high';
  else if (red >= 1 || yellow >= 3) urgency_level = 'medium';

  // Generate reasoning
  const reasoning: string[] = [];
  
  if (red > 0) {
    reasoning.push(`ผู้ป่วยวิกฤต (สีแดง) ${red} ราย — คาดว่าต้องใช้ ICU ${icu_beds} เตียง`);
  }
  if (or_rooms > 0) {
    reasoning.push(`คาดการณ์ต้องเตรียมห้องผ่าตัด ${or_rooms} ห้อง จากผู้ป่วยหนัก ${red + yellow} ราย`);
  }
  if (total_blood > 0) {
    reasoning.push(`ต้องเตรียมเลือดรวม ~${total_blood} ยูนิต (เน้นกรุ๊ป O สำหรับฉุกเฉิน)`);
  }
  if (ventilators > 0) {
    reasoning.push(`เครื่องช่วยหายใจที่อาจต้องใช้ ${ventilators} เครื่อง`);
  }
  if (surgeons_needed > 0) {
    reasoning.push(`ต้องเรียกศัลยแพทย์เพิ่มอย่างน้อย ${surgeons_needed} คน`);
  }
  if (green > 0 && red === 0 && yellow === 0) {
    reasoning.push(`ผู้บาดเจ็บเล็กน้อย ${green} ราย ไม่จำเป็นต้องเตรียมทรัพยากรพิเศษ`);
  }

  // Confidence based on data completeness
  const confidence = Math.min(95, 60 + (total * 2));

  return {
    prediction: {
      icu_beds,
      or_rooms,
      ventilators,
      blood_o_units,
      blood_a_units,
      blood_b_units,
      surgeons_needed,
      doctors_needed,
      estimated_ambulances,
    },
    reasoning,
    urgency_level,
    confidence,
  };
}

// Get urgency color classes
export function getUrgencyStyles(level: PredictionResult['urgency_level']) {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        badge: 'bg-red-600 text-white',
        label: '🔴 วิกฤต — ต้องเตรียมพร้อมสูงสุด',
        glow: 'shadow-red-500/20',
        lineBg: 'bg-red-500',
      };
    case 'high':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-700 dark:text-orange-400',
        badge: 'bg-orange-600 text-white',
        label: '🟠 สูง — ต้องเรียกทีมเสริม',
        glow: 'shadow-orange-500/20',
        lineBg: 'bg-orange-500',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-400',
        badge: 'bg-yellow-600 text-white',
        label: '🟡 ปานกลาง — เตรียมพร้อมเพิ่มเติม',
        glow: 'shadow-yellow-500/20',
        lineBg: 'bg-yellow-500',
      };
    default:
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        badge: 'bg-green-600 text-white',
        label: '🟢 ต่ำ — สถานการณ์ปกติ',
        glow: 'shadow-green-500/20',
        lineBg: 'bg-green-500',
      };
  }
}
