// Area code → city/state map (major metros)
const AREA_CODE_MAP: Record<string, { city: string; state: string }> = {
  '212': { city: 'New York', state: 'NY' }, '917': { city: 'New York', state: 'NY' },
  '646': { city: 'New York', state: 'NY' }, '718': { city: 'New York', state: 'NY' },
  '310': { city: 'Los Angeles', state: 'CA' }, '213': { city: 'Los Angeles', state: 'CA' },
  '323': { city: 'Los Angeles', state: 'CA' }, '424': { city: 'Los Angeles', state: 'CA' },
  '312': { city: 'Chicago', state: 'IL' }, '773': { city: 'Chicago', state: 'IL' },
  '713': { city: 'Houston', state: 'TX' }, '832': { city: 'Houston', state: 'TX' },
  '480': { city: 'Phoenix', state: 'AZ' }, '602': { city: 'Phoenix', state: 'AZ' },
  '623': { city: 'Phoenix', state: 'AZ' }, '520': { city: 'Tucson', state: 'AZ' },
  '215': { city: 'Philadelphia', state: 'PA' }, '267': { city: 'Philadelphia', state: 'PA' },
  '210': { city: 'San Antonio', state: 'TX' }, '726': { city: 'San Antonio', state: 'TX' },
  '619': { city: 'San Diego', state: 'CA' }, '858': { city: 'San Diego', state: 'CA' },
  '214': { city: 'Dallas', state: 'TX' }, '972': { city: 'Dallas', state: 'TX' },
  '469': { city: 'Dallas', state: 'TX' },
  '408': { city: 'San Jose', state: 'CA' }, '415': { city: 'San Francisco', state: 'CA' },
  '512': { city: 'Austin', state: 'TX' }, '737': { city: 'Austin', state: 'TX' },
  '904': { city: 'Jacksonville', state: 'FL' }, '305': { city: 'Miami', state: 'FL' },
  '786': { city: 'Miami', state: 'FL' }, '954': { city: 'Fort Lauderdale', state: 'FL' },
  '614': { city: 'Columbus', state: 'OH' }, '380': { city: 'Columbus', state: 'OH' },
  '317': { city: 'Indianapolis', state: 'IN' }, '463': { city: 'Indianapolis', state: 'IN' },
  '206': { city: 'Seattle', state: 'WA' }, '253': { city: 'Tacoma', state: 'WA' },
  '615': { city: 'Nashville', state: 'TN' }, '629': { city: 'Nashville', state: 'TN' },
  '720': { city: 'Denver', state: 'CO' }, '303': { city: 'Denver', state: 'CO' },
  '702': { city: 'Las Vegas', state: 'NV' }, '725': { city: 'Las Vegas', state: 'NV' },
  '503': { city: 'Portland', state: 'OR' }, '971': { city: 'Portland', state: 'OR' },
  '405': { city: 'Oklahoma City', state: 'OK' },
  '901': { city: 'Memphis', state: 'TN' }, '870': { city: 'Little Rock', state: 'AR' },
  '502': { city: 'Louisville', state: 'KY' }, '270': { city: 'Bowling Green', state: 'KY' },
  '443': { city: 'Baltimore', state: 'MD' }, '410': { city: 'Baltimore', state: 'MD' },
  '414': { city: 'Milwaukee', state: 'WI' }, '262': { city: 'Milwaukee', state: 'WI' },
  '505': { city: 'Albuquerque', state: 'NM' }, '575': { city: 'Las Cruces', state: 'NM' },
  '385': { city: 'Salt Lake City', state: 'UT' }, '801': { city: 'Salt Lake City', state: 'UT' },
  '423': { city: 'Chattanooga', state: 'TN' },
  '770': { city: 'Atlanta', state: 'GA' }, '404': { city: 'Atlanta', state: 'GA' },
  '678': { city: 'Atlanta', state: 'GA' },
  '704': { city: 'Charlotte', state: 'NC' }, '980': { city: 'Charlotte', state: 'NC' },
  '919': { city: 'Raleigh', state: 'NC' }, '984': { city: 'Raleigh', state: 'NC' },
  '314': { city: 'St. Louis', state: 'MO' }, '636': { city: 'St. Louis', state: 'MO' },
  '813': { city: 'Tampa', state: 'FL' }, '727': { city: 'St. Petersburg', state: 'FL' },
  '407': { city: 'Orlando', state: 'FL' }, '321': { city: 'Orlando', state: 'FL' },
  '352': { city: 'Gainesville', state: 'FL' }, '850': { city: 'Tallahassee', state: 'FL' },
};

export interface MetroResult {
  city: string;
  state: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export function detectMetro(content: string, address: string | null, phone: string | null): MetroResult {
  // 1. Try address first (highest confidence)
  if (address) {
    const match = address.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*\d{5}/);
    if (match) {
      return { city: match[1].trim(), state: match[2], confidence: 'high', source: 'address' };
    }
  }

  // 2. Look for "Serving [City]" or "serving [City], [State]" patterns
  const servingMatch = content.match(/serving\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*([A-Z]{2})/i);
  if (servingMatch) {
    return { city: servingMatch[1], state: servingMatch[2], confidence: 'high', source: 'serving-clause' };
  }

  // 3. "Located in [City]" or "based in [City]"
  const locatedMatch = content.match(/(?:located|based)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*([A-Z]{2})/i);
  if (locatedMatch) {
    return { city: locatedMatch[1], state: locatedMatch[2], confidence: 'high', source: 'located-clause' };
  }

  // 4. Area code lookup
  if (phone) {
    const areaCode = phone.replace(/\D/g, '').slice(0, 3);
    if (AREA_CODE_MAP[areaCode]) {
      const { city, state } = AREA_CODE_MAP[areaCode];
      return { city, state, confidence: 'medium', source: 'area-code' };
    }
  }

  // 5. Look for state abbreviation + city in content
  const stateMatch = content.match(/\b([A-Z][a-z]{2,20}),\s*([A-Z]{2})\b/);
  if (stateMatch) {
    return { city: stateMatch[1], state: stateMatch[2], confidence: 'low', source: 'content-scan' };
  }

  return { city: 'Unknown', state: 'Unknown', confidence: 'low', source: 'none' };
}
