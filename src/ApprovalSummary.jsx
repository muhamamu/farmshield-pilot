import React from 'react';
import {farmTotals} from './farm-lifecycle.mjs';
export function ApprovalSummary({rows}){
 const totals=farmTotals(rows);
 return <section className="approval-summary" aria-label="Farm approval totals"><div><strong>{totals.currentApproved}</strong><span>Currently approved</span></div><div><strong>{totals.totalApproved}</strong><span>Total ever approved</span></div><div><strong>{totals.deleted}</strong><span>Deleted farms</span></div><p>Total ever approved counts each farm once, including {totals.deletedApproved} deleted {totals.deletedApproved===1?'farm':'farms'} that received approval. Currently approved excludes deleted farms and farms awaiting a new review.</p></section>;
}
