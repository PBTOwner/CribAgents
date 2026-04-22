import PDFDocument from 'pdfkit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
}

interface PropertyInfo {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  yearBuilt?: number | null;
  price?: string | null;
  description?: string | null;
  parcelId?: string | null;
  legalDescription?: string | null;
}

interface PurchaseContractParams {
  buyer: UserInfo;
  seller: UserInfo;
  property: PropertyInfo;
  terms: {
    price?: number;
    deposit?: number;
    closing_date?: string;
    inspection_period_days?: number;
    financing_type?: string;
    loan_amount?: number;
    conditions?: string[];
    title_company?: string;
    escrow_agent?: string;
  };
}

interface LeaseAgreementParams {
  landlord: UserInfo;
  tenant: UserInfo;
  property: PropertyInfo;
  terms: {
    monthly_rent?: number;
    security_deposit?: number;
    lease_start?: string;
    lease_end?: string;
    late_fee?: number;
    pet_deposit?: number;
    pet_allowed?: boolean;
    utilities_included?: string[];
    parking?: string;
    conditions?: string[];
  };
}

interface SellerDisclosureParams {
  seller: UserInfo;
  property: PropertyInfo;
  disclosures?: {
    roof_age?: number;
    roof_condition?: string;
    foundation_issues?: boolean;
    hvac_age?: number;
    hvac_condition?: string;
    plumbing_issues?: boolean;
    electrical_issues?: boolean;
    water_heater_age?: number;
    flood_zone?: string;
    sinkhole_activity?: boolean;
    radon_tested?: boolean;
    radon_level?: string;
    mold_issues?: boolean;
    termite_damage?: boolean;
    hoa_name?: string;
    hoa_fee?: number;
    known_defects?: string;
    material_facts?: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullName(user: UserInfo): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.name) return user.name;
  return user.email;
}

function propertyFullAddress(p: PropertyInfo): string {
  const parts = [p.address, p.city, p.state, p.zip].filter(Boolean);
  return parts.join(', ');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(title, { align: 'center' })
    .moveDown(0.3);
  doc
    .fontSize(10)
    .font('Helvetica')
    .text('State of Florida', { align: 'center' })
    .moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.8);
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value);
}

function addSignatureBlock(doc: PDFKit.PDFDocument, role: string, name: string): void {
  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(300, doc.y).stroke();
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').text(`${role}: ${name}`);
  doc.text(`Date: ____________________`);
}

// ---------------------------------------------------------------------------
// 1. Purchase Contract (FAR/BAR "AS IS")
// ---------------------------------------------------------------------------

export async function generatePurchaseContract(params: PurchaseContractParams): Promise<Buffer> {
  const { buyer, seller, property, terms } = params;
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

  addHeader(doc, 'FAR/BAR "AS IS" RESIDENTIAL CONTRACT FOR SALE AND PURCHASE');

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.fontSize(10).font('Helvetica');
  doc.text(`Date: ${today}`);
  doc.moveDown(0.3);

  // Parties
  addSectionTitle(doc, '1. PARTIES');
  addField(doc, 'BUYER(S)', fullName(buyer));
  addField(doc, 'Buyer Address', buyer.address || '________________________________');
  addField(doc, 'Buyer Email', buyer.email);
  addField(doc, 'Buyer Phone', buyer.phone || '________________________________');
  doc.moveDown(0.3);
  addField(doc, 'SELLER(S)', fullName(seller));
  addField(doc, 'Seller Address', seller.address || '________________________________');
  addField(doc, 'Seller Email', seller.email);
  addField(doc, 'Seller Phone', seller.phone || '________________________________');

  // Property
  addSectionTitle(doc, '2. PROPERTY DESCRIPTION');
  addField(doc, 'Street Address', propertyFullAddress(property));
  addField(doc, 'Legal Description', property.legalDescription || 'See attached legal description');
  addField(doc, 'Parcel ID', property.parcelId || '________________________');
  addField(doc, 'County', 'Palm Beach');

  // Purchase price
  addSectionTitle(doc, '3. PURCHASE PRICE AND METHOD OF PAYMENT');
  const price = terms.price || 0;
  const deposit = terms.deposit || price * 0.03;
  addField(doc, 'Purchase Price', formatCurrency(price));
  addField(doc, 'Earnest Money Deposit', formatCurrency(deposit));
  addField(doc, 'Deposit to be held by', terms.escrow_agent || 'Escrow Agent (TBD)');
  doc.moveDown(0.3);
  doc.text(
    `Balance to close (subject to adjustments and prorations): ${formatCurrency(price - deposit)}`,
  );
  doc.moveDown(0.3);
  addField(doc, 'Financing', terms.financing_type || 'Conventional Mortgage');
  if (terms.loan_amount) {
    addField(doc, 'Loan Amount', formatCurrency(terms.loan_amount));
  }

  // Closing
  addSectionTitle(doc, '4. CLOSING DATE AND LOCATION');
  addField(doc, 'Closing Date', terms.closing_date || '30 days from effective date');
  addField(doc, 'Title Company', terms.title_company || 'To be determined');
  doc.text(
    'Closing shall take place in Palm Beach County, Florida, or at a location mutually agreed upon by the parties.',
  );

  // Inspection
  addSectionTitle(doc, '5. INSPECTION PERIOD');
  const inspectionDays = terms.inspection_period_days || 15;
  doc.text(
    `Buyer shall have ${inspectionDays} calendar days from the Effective Date ("Inspection Period") to conduct inspections, ` +
      `investigations, and assessments of the Property at Buyer's expense. If Buyer determines, in Buyer's sole discretion, ` +
      `that the Property is not acceptable, Buyer may terminate this Contract by delivering written notice to Seller ` +
      `before expiration of the Inspection Period, and Buyer's deposit shall be returned.`,
  );

  // AS IS condition
  addSectionTitle(doc, '6. PROPERTY CONDITION — "AS IS"');
  doc.text(
    `Buyer acknowledges and agrees that Buyer is purchasing the Property in its present "AS IS" condition, ` +
      `with all faults, and with no warranties express or implied from Seller. Seller shall have no obligation ` +
      `to make repairs or improvements. Buyer has the right to inspect the Property during the Inspection Period ` +
      `as set forth in Section 5.`,
  );

  // Closing costs
  addSectionTitle(doc, '7. CLOSING COSTS AND PRORATIONS');
  doc.text('(a) Documentary stamp taxes on the deed shall be paid by SELLER.');
  doc.text(
    '(b) Owner\'s title insurance policy premium shall be paid by SELLER (Palm Beach County custom).',
  );
  doc.text('(c) Real estate taxes and assessments shall be prorated as of the Closing Date.');
  doc.text('(d) Buyer shall pay for lender\'s title insurance, survey, and lender-required fees.');
  doc.text(
    `(e) Documentary stamps on notes and intangible tax on mortgages shall be paid by BUYER.`,
  );
  doc.text('(f) Recording fees for the deed shall be paid by BUYER.');

  // Conditions / contingencies
  if (terms.conditions && terms.conditions.length > 0) {
    addSectionTitle(doc, '8. ADDITIONAL CONDITIONS');
    terms.conditions.forEach((c, idx) => {
      doc.text(`${idx + 1}. ${c}`);
    });
  }

  // Default & remedies
  addSectionTitle(doc, '9. DEFAULT AND REMEDIES');
  doc.text(
    'If Buyer defaults, Seller may retain the deposit as liquidated damages, release both parties, or seek specific performance. ' +
      'If Seller defaults, Buyer may seek return of deposit and specific performance, or damages.',
  );

  // Dispute resolution
  addSectionTitle(doc, '10. DISPUTE RESOLUTION');
  doc.text(
    'Disputes shall be resolved by mediation under Florida law. If mediation is unsuccessful, the prevailing party ' +
      'in any litigation shall be entitled to reasonable attorney\'s fees and costs.',
  );

  // Governing law
  addSectionTitle(doc, '11. GOVERNING LAW');
  doc.text('This Contract shall be governed by and construed in accordance with the laws of the State of Florida.');

  // Signatures
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text('SIGNATURES', { align: 'center' });
  addSignatureBlock(doc, 'BUYER', fullName(buyer));
  addSignatureBlock(doc, 'SELLER', fullName(seller));

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#888888');
  doc.text(
    'This document is a template generated by CribAgents. It should be reviewed by a Florida-licensed attorney before execution. ' +
      'This form is based on the FAR/BAR "AS IS" Residential Contract for Sale and Purchase and is not a substitute for legal advice.',
    { align: 'center' },
  );

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// 2. Lease Agreement
// ---------------------------------------------------------------------------

export async function generateLeaseAgreement(params: LeaseAgreementParams): Promise<Buffer> {
  const { landlord, tenant, property, terms } = params;
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

  addHeader(doc, 'FLORIDA RESIDENTIAL LEASE AGREEMENT');

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fontSize(10).font('Helvetica').text(`Date: ${today}`);
  doc.moveDown(0.3);

  // Parties
  addSectionTitle(doc, '1. PARTIES');
  addField(doc, 'LANDLORD', fullName(landlord));
  addField(doc, 'Landlord Address', landlord.address || '________________________________');
  addField(doc, 'Landlord Email', landlord.email);
  addField(doc, 'Landlord Phone', landlord.phone || '________________________________');
  doc.moveDown(0.3);
  addField(doc, 'TENANT', fullName(tenant));
  addField(doc, 'Tenant Email', tenant.email);
  addField(doc, 'Tenant Phone', tenant.phone || '________________________________');

  // Property
  addSectionTitle(doc, '2. PREMISES');
  addField(doc, 'Property Address', propertyFullAddress(property));
  doc.text(
    `The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the Landlord, ` +
      `the above-described premises together with all appurtenances thereto.`,
  );

  // Lease term
  addSectionTitle(doc, '3. LEASE TERM');
  addField(doc, 'Lease Start Date', terms.lease_start || '________________________________');
  addField(doc, 'Lease End Date', terms.lease_end || '________________________________');
  doc.text(
    'Unless terminated in accordance with this Agreement, the lease shall automatically convert to a month-to-month tenancy upon expiration.',
  );

  // Rent
  addSectionTitle(doc, '4. RENT');
  const rent = terms.monthly_rent || 0;
  addField(doc, 'Monthly Rent', formatCurrency(rent));
  doc.text('Rent is due on the 1st day of each month and shall be payable to Landlord.');
  doc.moveDown(0.3);

  const lateFee = terms.late_fee || Math.round(rent * 0.05);
  addField(doc, 'Late Fee', `${formatCurrency(lateFee)} if rent is not received by the 5th of the month`);
  doc.text(
    'Per Florida Statute 83.56, Landlord must provide written 3-day notice before initiating eviction proceedings for non-payment.',
  );

  // Security deposit
  addSectionTitle(doc, '5. SECURITY DEPOSIT');
  const securityDeposit = terms.security_deposit || rent;
  addField(doc, 'Security Deposit', formatCurrency(securityDeposit));
  doc.text(
    'Per Florida Statute 83.49, the Landlord shall hold the security deposit in a separate interest-bearing or non-interest-bearing account ' +
      'in a Florida banking institution, OR post a surety bond. Within 30 days of receiving the deposit, Landlord must notify Tenant in writing ' +
      'of the bank name, address, and whether the account is interest-bearing or non-interest-bearing.',
  );
  doc.moveDown(0.3);
  doc.text(
    'Within 15 days of lease termination (if no claim is made) or within 30 days (if a claim is made), ' +
      'Landlord shall return the deposit or provide notice by certified mail of intent to impose a claim on the deposit.',
  );

  // Utilities
  addSectionTitle(doc, '6. UTILITIES');
  if (terms.utilities_included && terms.utilities_included.length > 0) {
    doc.text(`Utilities included in rent: ${terms.utilities_included.join(', ')}`);
  } else {
    doc.text('Tenant shall be responsible for all utilities including electric, water, sewer, gas, internet, and trash.');
  }

  // Pet policy
  addSectionTitle(doc, '7. PET POLICY');
  if (terms.pet_allowed) {
    doc.text('Pets ARE permitted subject to the following conditions:');
    if (terms.pet_deposit) {
      addField(doc, 'Additional Pet Deposit', formatCurrency(terms.pet_deposit));
    }
    doc.text('Tenant is responsible for any pet-related damage beyond normal wear and tear.');
  } else {
    doc.text(
      'NO PETS are allowed on the premises without prior written consent of the Landlord. ' +
        'Service animals and emotional support animals are exempt per Florida and federal fair housing law.',
    );
  }

  // Maintenance
  addSectionTitle(doc, '8. MAINTENANCE AND REPAIRS');
  doc.text('LANDLORD responsibilities:');
  doc.text('  - Maintain the structural components (roof, foundation, exterior walls)');
  doc.text('  - Maintain plumbing, heating, and electrical systems');
  doc.text('  - Maintain common areas (if applicable)');
  doc.text('  - Comply with all building, housing, and health codes');
  doc.moveDown(0.3);
  doc.text('TENANT responsibilities:');
  doc.text('  - Keep the premises clean and sanitary');
  doc.text('  - Use all fixtures and appliances in a reasonable manner');
  doc.text('  - Not destroy, deface, or remove any property belonging to Landlord');
  doc.text('  - Promptly notify Landlord of any maintenance issues');

  // Florida-specific disclosures
  addSectionTitle(doc, '9. REQUIRED FLORIDA DISCLOSURES');

  doc.font('Helvetica-Bold').text('RADON GAS DISCLOSURE (Florida Statute 404.056):');
  doc.font('Helvetica').text(
    'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient ' +
      'quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal ' +
      'and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing ' +
      'may be obtained from your county health department.',
  );
  doc.moveDown(0.5);

  if (property.yearBuilt && property.yearBuilt < 1978) {
    doc.font('Helvetica-Bold').text('LEAD-BASED PAINT DISCLOSURE (Pre-1978 Property):');
    doc.font('Helvetica').text(
      'Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards ' +
        'if not managed properly. Lead exposure is especially harmful to young children and pregnant women. A lead-based paint ' +
        'inspection or risk assessment may be conducted at Tenant\'s expense. Landlord has provided Tenant with the EPA pamphlet ' +
        '"Protect Your Family From Lead in Your Home."',
    );
    doc.moveDown(0.5);
  }

  // Parking
  if (terms.parking) {
    addSectionTitle(doc, '10. PARKING');
    doc.text(terms.parking);
  }

  // Additional conditions
  if (terms.conditions && terms.conditions.length > 0) {
    addSectionTitle(doc, '11. ADDITIONAL TERMS AND CONDITIONS');
    terms.conditions.forEach((c, idx) => {
      doc.text(`${idx + 1}. ${c}`);
    });
  }

  // Governing law
  addSectionTitle(doc, '12. GOVERNING LAW');
  doc.text(
    'This Lease shall be governed by Florida Statutes Chapter 83, Part II (Florida Residential Landlord and Tenant Act).',
  );

  // Signatures
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text('SIGNATURES', { align: 'center' });
  addSignatureBlock(doc, 'LANDLORD', fullName(landlord));
  addSignatureBlock(doc, 'TENANT', fullName(tenant));

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#888888');
  doc.text(
    'This document is a template generated by CribAgents. It should be reviewed by a Florida-licensed attorney before execution.',
    { align: 'center' },
  );

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// 3. Seller's Property Disclosure
// ---------------------------------------------------------------------------

export async function generateSellerDisclosure(params: SellerDisclosureParams): Promise<Buffer> {
  const { seller, property, disclosures = {} } = params;
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

  addHeader(doc, "SELLER'S PROPERTY DISCLOSURE STATEMENT");

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fontSize(10).font('Helvetica').text(`Date: ${today}`);
  doc.moveDown(0.3);

  doc.text(
    'The Seller makes the following disclosures based on Seller\'s actual knowledge of the property as of the date listed above. ' +
      'This is not a warranty of any kind by the Seller or any agent representing the Seller. This disclosure is not a substitute ' +
      'for inspections or warranties the Buyer may wish to obtain.',
  );
  doc.moveDown(0.5);

  // Property info
  addSectionTitle(doc, '1. PROPERTY INFORMATION');
  addField(doc, 'Seller', fullName(seller));
  addField(doc, 'Property Address', propertyFullAddress(property));
  addField(doc, 'Legal Description', property.legalDescription || 'See deed on file with Palm Beach County Clerk');
  addField(doc, 'Parcel ID', property.parcelId || '________________________');
  addField(doc, 'Year Built', property.yearBuilt ? property.yearBuilt.toString() : 'Unknown');
  addField(doc, 'Approx. Square Footage', property.sqft ? property.sqft.toLocaleString() : 'Unknown');

  // Structural
  addSectionTitle(doc, '2. STRUCTURAL COMPONENTS');

  const yesNo = (val: boolean | undefined) => (val === true ? 'Yes' : val === false ? 'No' : 'Unknown');
  const strVal = (val: string | number | undefined | null, fallback = 'Unknown') =>
    val !== undefined && val !== null ? String(val) : fallback;

  addField(doc, 'Roof Age (years)', strVal(disclosures.roof_age));
  addField(doc, 'Roof Condition', strVal(disclosures.roof_condition));
  addField(doc, 'Foundation Issues', yesNo(disclosures.foundation_issues));
  doc.text('Walls: Are you aware of any cracks, water damage, or structural issues?  ____________________');
  doc.text('Windows/Doors: Are you aware of any broken seals, leaks, or damage?  ____________________');

  // Systems
  addSectionTitle(doc, '3. MECHANICAL SYSTEMS');
  addField(doc, 'HVAC System Age (years)', strVal(disclosures.hvac_age));
  addField(doc, 'HVAC Condition', strVal(disclosures.hvac_condition));
  addField(doc, 'Known Plumbing Issues', yesNo(disclosures.plumbing_issues));
  addField(doc, 'Known Electrical Issues', yesNo(disclosures.electrical_issues));
  addField(doc, 'Water Heater Age (years)', strVal(disclosures.water_heater_age));
  doc.text('Appliances included in sale: ____________________________________________________');

  // Environmental
  addSectionTitle(doc, '4. ENVIRONMENTAL CONDITIONS');
  addField(doc, 'Flood Zone Designation', strVal(disclosures.flood_zone, 'Check FEMA maps'));
  doc.text(
    'Note: Properties in flood zones AE, VE, AH, or AO in Palm Beach County require flood insurance if there is a federally-backed mortgage.',
  );
  doc.moveDown(0.3);
  addField(doc, 'Known Sinkhole Activity', yesNo(disclosures.sinkhole_activity));
  doc.text(
    'Per Florida Statute 627.7073, Seller must disclose known sinkhole claims or testing.',
  );
  doc.moveDown(0.3);
  addField(doc, 'Radon Testing Conducted', yesNo(disclosures.radon_tested));
  addField(doc, 'Radon Level (pCi/L)', strVal(disclosures.radon_level));
  doc.moveDown(0.3);
  addField(doc, 'Known Mold Issues', yesNo(disclosures.mold_issues));
  addField(doc, 'Known Termite/WDO Damage', yesNo(disclosures.termite_damage));

  // Lead paint
  if (property.yearBuilt && property.yearBuilt < 1978) {
    addSectionTitle(doc, '5. LEAD-BASED PAINT (Pre-1978 Property)');
    doc.text('This property was built before 1978 and may contain lead-based paint.');
    doc.text('[ ] Seller has knowledge of lead-based paint in the property.');
    doc.text('[ ] Seller has no knowledge of lead-based paint in the property.');
    doc.text('[ ] Seller has provided available records or reports regarding lead-based paint.');
  }

  // Defects and material facts
  addSectionTitle(doc, property.yearBuilt && property.yearBuilt < 1978 ? '6. KNOWN DEFECTS AND MATERIAL FACTS' : '5. KNOWN DEFECTS AND MATERIAL FACTS');
  doc.text(
    'Are you aware of any material defects in the property that have not been disclosed above?',
  );
  doc.moveDown(0.3);
  if (disclosures.known_defects) {
    doc.text(disclosures.known_defects);
  } else {
    doc.text('________________________________________________________________________');
    doc.text('________________________________________________________________________');
    doc.text('________________________________________________________________________');
  }

  doc.moveDown(0.3);
  doc.text('Additional material facts:');
  if (disclosures.material_facts) {
    doc.text(disclosures.material_facts);
  } else {
    doc.text('________________________________________________________________________');
    doc.text('________________________________________________________________________');
  }

  // HOA
  const hoaSection = property.yearBuilt && property.yearBuilt < 1978 ? '7' : '6';
  addSectionTitle(doc, `${hoaSection}. HOMEOWNERS ASSOCIATION (HOA)`);
  if (disclosures.hoa_name) {
    addField(doc, 'HOA Name', disclosures.hoa_name);
    addField(doc, 'Monthly/Quarterly Fee', disclosures.hoa_fee ? formatCurrency(disclosures.hoa_fee) : 'Unknown');
    doc.text(
      'Per Florida Statute 720.401, Buyer has 3 days after receiving HOA disclosure to cancel the contract.',
    );
  } else {
    doc.text('[ ] Property IS subject to a Homeowners Association');
    doc.text('[ ] Property is NOT subject to a Homeowners Association');
  }

  // Certification
  const certSection = property.yearBuilt && property.yearBuilt < 1978 ? '8' : '7';
  addSectionTitle(doc, `${certSection}. SELLER CERTIFICATION`);
  doc.text(
    'The Seller certifies that the information provided in this disclosure is true and correct to the best of Seller\'s ' +
      'actual knowledge as of the date signed below. Seller agrees to notify Buyer of any material changes prior to closing.',
  );

  // Signatures
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text('SIGNATURES', { align: 'center' });
  addSignatureBlock(doc, 'SELLER', fullName(seller));
  doc.moveDown(1);
  doc.text('BUYER ACKNOWLEDGMENT');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).text(
    'Buyer acknowledges receipt of this Seller\'s Property Disclosure Statement.',
  );
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(300, doc.y).stroke();
  doc.moveDown(0.2);
  doc.text('Buyer Signature                                     Date: ____________________');

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#888888');
  doc.text(
    'This document is a template generated by CribAgents. It should be reviewed by a Florida-licensed attorney before execution.',
    { align: 'center' },
  );

  return pdfToBuffer(doc);
}
