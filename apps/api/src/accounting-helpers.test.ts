import { describe, it, expect } from 'vitest';
import { cleanName } from '../../../libs/domains/accounting/shared/helpers';
import { parseOFX } from '../../../libs/domains/accounting/commands/import-bank-statement/handler';

describe('cleanName', () => {
  it('should clean name correctly by removing accents, parentheses, extra spaces, and lowercase it', () => {
    expect(cleanName('Jean-Marc')).toBe('jean-marc');
    expect(cleanName('Élise (Parent)')).toBe('elise');
    expect(cleanName('  Hélène   ')).toBe('helene');
    expect(cleanName(null)).toBe('');
  });
});

describe('parseOFX', () => {
  it('should parse simple OFX contents and determine accountId correctly', () => {
    const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<SIGNONMSGSRSV1>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>EUR</CURDEF>
<BANKTRANLIST>
<ACCTID>00070007847</ACCTID>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260718120000</DTPOSTED>
<TRNAMT>-15.50</TRNAMT>
<FITID>TX12345</FITID>
<NAME>Supermarket</NAME>
<MEMO>Weekly grocery</MEMO>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
    const result = parseOFX(ofxContent);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toEqual({
      fitid: 'TX12345',
      accountId: 'savings',
      amount: -1550,
      date: '2026-07-18',
      name: 'Supermarket',
      memo: 'Weekly grocery'
    });
  });

  it('should fallback to current account if ACCTID is not savings', () => {
    const ofxContent = `
<BANKTRANLIST>
<ACCTID>123456789</ACCTID>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20260718</DTPOSTED>
<TRNAMT>100.00</TRNAMT>
<FITID>TX67890</FITID>
<NAME>Salary</NAME>
</STMTTRN>
</BANKTRANLIST>
`;
    const result = parseOFX(ofxContent);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toEqual({
      fitid: 'TX67890',
      accountId: 'current',
      amount: 10000,
      date: '2026-07-18',
      name: 'Salary',
      memo: null
    });
  });
});
