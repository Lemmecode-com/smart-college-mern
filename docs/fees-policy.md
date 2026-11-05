# NOVAA ERP — Institutional Fees & Statutory GST Policy

**Document Reference:** POL-FEE-GST-2026-01  
**Target Release:** NOVAA ERP v2.1+ (Issue #212)  
**Status:** Management Approved (Proposed Rates) / Pending Statutory Tax-Advisor Verification  
**Effective Date:** Upon formal statutory activation and verification  

---

## 1. Executive Summary & Objective

This policy document governs fee assessment, statutory Goods and Services Tax (GST) computation, installment allocation, and tax receipt issuance across the NOVAA Smart College ERP platform.

The institution adopts a **GST-Exclusive Pricing Model** for all academic and auxiliary fee components. The system is designed to maintain complete transparency, zero-drift rounding reconciliation, backward compatibility with legacy fee records, and strict compliance with the Central Goods and Services Tax (CGST) Act, 2017, the State Goods and Services Tax (SGST) Acts, and the Integrated Goods and Services Tax (IGST) Act.

> [!IMPORTANT]
> **Statutory Notice:** Management approval of proposed fee rates establishes internal operational pricing only. It **does not** by itself establish statutory tax exemption or definitive classification under GST law. Formal tax classification under Notification No. 12/2017-Central Tax (Rate) and subsequent GST Council circulars requires formal confirmation from qualified tax advisors and legal counsel.

---

## 2. Approved Proposed Fee Component Rates

The college management has reviewed and approved the following schedule of proposed rates for fee components:

| Fee Component | Approved Proposed Rate | Classification Status | Statutory Basis / Notes |
|:---|:---:|:---:|:---|
| **Tuition Fee** | **0%** | Exemption Claim Proposed | Proposed under educational core curriculum exemption (Notification 12/2017-CT(R), Entry 66(a)). |
| **Laboratory Fee** | **18%** | Taxable Standard Rate | Auxiliary practical educational lab facilities. |
| **Sports Fee** | **18%** | Taxable Standard Rate | Sports, gymnasium, and extracurricular physical training amenities. |
| **Transport Fee** | **5%** | Concessional Rate | Student and staff bus/van transit services (passenger transport service). |
| **Library Fee** | **Not yet specified** | Pending Review | Under active legal and tax counsel evaluation. No rate is assigned. |
| **Other Fees** | **Not yet specified** | Pending Review | Miscellaneous charges (exam fees, lab deposits, fines, alumni dues) pending review. |

### Strict Policy Guard Constraints:
1. **No Rate Invention:** Neither system administrators nor ERP software modules may invent, infer, or default rates for **Library Fee**, **Other Fees**, or any unlisted fee component.
2. **Rejection of Unspecified Components:** Any attempt to configure fee structures containing unapproved components or rates not listed above must be rejected server-side with error code `UNAPPROVED_FEE_COMPONENT_OR_RATE`.
3. **Explicit Rates Mandatory:** Missing GST rates cannot silently default to 0%. Every component must explicitly declare an approved rate, preventing accidental or unauthorized tax exemption.

---

## 3. Pricing Model & Mathematical Formulation

### 3.1 GST-Exclusive Calculation
In the GST-exclusive model, all fee components are defined by their pre-tax base cost. Applicable GST is added on top of the base amount to determine the gross payable amount.

$$\text{Component Tax} = \text{Round}\left(\text{Base Amount} \times \frac{\text{GST Rate}}{100}\right)$$

$$\text{Gross Amount} = \text{Base Amount} + \text{Component Tax}$$

Where:
- $\text{Total Base Fee} = \sum \text{Component Base Amounts}$
- $\text{Total Tax} = \sum \text{Component Tax Amounts}$
- $\text{Total Gross Fee} = \text{Total Base Fee} + \text{Total Tax}$

### 3.2 Tax Split Treatment

#### Intra-State Supply (College and Student in the same State):
The supply is subject to equal split between Central GST (CGST) and State GST (SGST):
- $\text{CGST Rate} = \frac{\text{GST Rate}}{2}$
- $\text{SGST Rate} = \frac{\text{GST Rate}}{2}$
- $\text{CGST Amount} = \text{Round}\left(\frac{\text{Total Tax}}{2}\right)$
- $\text{SGST Amount} = \text{Total Tax} - \text{CGST Amount}$

> [!NOTE]
> The SGST amount is computed as the residual difference $(\text{Total Tax} - \text{CGST Amount})$ to eliminate 1-paise rounding discrepancies for odd-paise calculations.

#### Inter-State Supply (Student residing in a different State):
The supply is subject to Integrated GST (IGST):
- $\text{IGST Rate} = \text{GST Rate}$
- $\text{IGST Amount} = \text{Total Tax}$
- $\text{CGST Amount} = 0$, $\text{SGST Amount} = 0$

---

## 4. Multi-Installment Allocation & Rounding Rules

### 4.1 Currency Rounding
All monetary calculations are performed in Indian Rupees (INR) rounded to two decimal places (half-up method) for intermediate transactions. For final statutory tax reporting, rounding adheres to Section 170 of the CGST Act (rounding to the nearest Rupee).

### 4.2 Largest Remainder Method (Hamilton Method)
When a total fee consisting of base fees and applicable taxes is divided across $N$ installments:
1. Each installment's gross amount equals the installment amount specified in the approved schedule.
2. The total tax is distributed proportionally across installments using the **Largest Remainder Method**:
   - Each installment receives a base floor share of tax: $\lfloor \frac{\text{Total Tax}}{N} \times 100 \rfloor / 100$.
   - Any remainder paise ($(\text{Total Tax} - \sum \text{Base Floor}) \times 100$) are distributed 1 paise at a time to installments in order.
3. The installment base amount is derived:
   $$\text{Installment Base} = \text{Installment Gross} - \text{Allocated Installment Tax}$$

### 4.3 Invariant Reconciliation
The system enforces the following mathematical invariants:
- $\sum_{i=1}^N \text{Installment Base}_i = \text{Total Base Fee}$
- $\sum_{i=1}^N \text{Installment Tax}_i = \text{Total Tax}$
- $\sum_{i=1}^N \text{Installment Gross}_i = \text{Total Gross Fee}$

---

## 5. GSTIN & Statutory Invoice Compliance

### 5.1 Supplier Identification Requirements
Under Section 31 of the CGST Act, 2017 read with Rule 46 of the CGST Rules, a tax invoice issued by a registered person must display:
1. Valid 15-character Goods and Services Tax Identification Number (GSTIN) of the college.
2. Legal name and registered address of the college.
3. Consecutive serial number unique for a financial year (containing alphabets, numerals, and special characters).
4. Date of issue.
5. Student details (Name, Enrollment Number, Academic Department).
6. Description of service / fee components.
7. Taxable value, tax rate, and tax amount split by tax type (CGST/SGST or IGST).
8. Place of supply.

### 5.2 Invoice Labeling Safeguard
- **Rule:** The ERP system **shall not** issue, render, or label any document as a **“GST Tax Invoice”** unless:
  1. Statutory GST policy has been explicitly activated server-side;
  2. The fee payment includes active, non-zero tax breakdown (`isTaxApplicable: true`); AND
  3. The college record contains a valid, verified 15-character GSTIN.
- **Fallback:** If any statutory criteria is unmet (e.g. GSTIN is missing, unregistered college, or zero tax rate without statutory invoice requirement), the generated receipt is designated strictly as a **“Fee Payment Receipt”** or **“Payment Receipt”**.

---

## 6. Backward Compatibility & Historical Record Preservation

To safeguard accounting integrity and historical audit trails:
1. **Immutable Historical Records:** All previously issued payment receipts, historical installments, and legacy fee structures created prior to policy activation remain completely immutable.
2. **Scalar Compatibility:** Fee structures and student fee records lacking component-level tax metadata are treated as legacy records (`taxBreakdown: null`, `baseFee = totalFee`, `totalTax = 0`).
3. **No Retroactive Recalculation:** Updates to existing fee structures apply strictly prospectively to future pending installments. Paid installments, their paid amounts, payment gateway transaction IDs, and associated audit records are preserved without modification.

---

## 7. Pending Policy Decisions (Deferred Until Statutory Verification)

The following financial workflows require formal statutory counsel and board resolution before technical implementation:
1. **Fee Discounts & Concessions:** Tax implications of post-supply price reductions under Section 15(3) of the CGST Act (credit notes vs. net pre-tax reduction) are deferred.
2. **Scholarships & Government Grants:** Treatment of direct student subsidies and government-funded scholarship programs against taxable components remains pending.
3. **Refunds & Course Cancellation:** Issuance of GST credit notes, time limits under Section 34(2), and adjustment against future tax liability are deferred.
4. **Partial Installment Payments:** Split taxation rules when a student pays less than the full scheduled installment amount are deferred.

Until verified by tax counsel, ERP operations for these workflows must follow standard accounting receipts without unilateral tax deductions.

---

## 8. Activation Gate & Technical Governance

1. **Default State:** Statutory GST policy is **DISABLED BY DEFAULT** across all environments (`ENABLE_STATUTORY_GST_POLICY=false`).
2. **Server-Side Activation Only:** Activation cannot be enabled by client requests, frontend toggles, query parameters, or unauthenticated API endpoints.
3. **Activation Prerequisites:**
   - Formal written opinion from registered Chartered Accountant / GST tax advisor.
   - Validation of college GSTIN against the GST Common Portal.
   - Formal notification of rates for Library and Other Fees.
   - Secure environment variable flag `ENABLE_STATUTORY_GST_POLICY=true` deployed to production backend.
