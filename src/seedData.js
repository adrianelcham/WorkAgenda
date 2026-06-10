import { uid } from './utils'

// ---------------------------------------------------------------------------
// Initial data extracted from the PDF agenda ("Work Agenda - DE, AE").
//
// makeSeedData() returns a FRESH copy (with brand-new ids) every time it is
// called, so the "Reset Demo Data" button always produces clean, unique ids.
//
// Data shape:
//   { meta, sections, matters }
//   meta:     { title, month, names: [] }
//   section:  { id, title, order }
//   matter:   { id, sectionId, matterNumber, matterName, matterType,
//               priority, status, previousActions[], nextSteps[],
//               nextCourtDate, notes, order }
//   task:     { id, text, done }
//
// Priority / status below are sensible starting guesses (the PDF only marked
// the "HIGH PRIORITY" section) — change them in the UI as needed.
// ---------------------------------------------------------------------------

// Build a task from a plain string.
const task = (text) => ({ id: uid('t'), text, done: false })

export function makeSeedData() {
  // Two sections, mirroring the headings in the PDF.
  const high = { id: uid('s'), title: 'HIGH PRIORITY', order: 0 }
  const rello = { id: uid('s'), title: 'RELLO', order: 1 }

  // Helper to build one matter row.
  const M = (sectionId, matterNumber, matterName, matterType, prev, next, court, priority, status) => ({
    id: uid('m'),
    sectionId,
    matterNumber,
    matterName,
    matterType,
    priority,
    status,
    previousActions: prev.map(task),
    nextSteps: next.map(task),
    nextCourtDate: court,
    notes: '',
    order: 0,
  })

  const matters = [
    // ---- HIGH PRIORITY -----------------------------------------------------
    M(high.id, '20253292', 'Wang', 'Home Building',
      ['Draft SOC', 'Icare notification', 'Notify certifiers insurer'],
      ['Instruct hydraulic engineer', 'Instruct Expert Certifier', 'Waiting on SOC',
       'Write to the other side re asbestos', 'Draft letter to structural engineer seeking documentation',
       'Respond to Nick Kenyon re instructions and documents', 'Instruct concrete expert',
       'Meeting with Jenny Friday'],
      '', 'High', 'In Progress'),

    M(high.id, '', 'Jennifer Mann', 'Property',
      [],
      ['Partition application in the SC', 'Get into it on FRIDAY 5 June'],
      '', 'High', 'In Progress'),

    M(high.id, '20222523', 'Hickey', 'Fraud/Home Building',
      ['Brief FM and CJCS', 'Draft affidavit for SC proceedings'],
      ['Conf w counsel - prepare for urgent injunction.'],
      '', 'Critical', 'In Progress'),

    M(high.id, '20253334', 'Ontrak Engineering', 'Debt Recovery',
      [],
      ["Draft offer to the other side (waiting on client's instructions)"],
      '', 'High', 'Waiting on Client'),

    M(high.id, '20263425', 'BioMed', 'Lease Dispute',
      ['File points of defence', 'Serve points of defence and respond to OS email re our offer URGENT'],
      ['Offer not accepted proceed'],
      'Directions - 24 June 2026', 'Critical', 'In Progress'),

    M(high.id, '20263436', 'Crown', 'Dispute',
      ['File amended defence', 'File CC', 'Draft amended cross-claim'],
      ['Finalise affidavit of John Forbes', 'File affidavits by Wednesday 3 June 2026',
       'File affidavit of service of te maire'],
      'Pre-trial review - 17 June 2026', 'High', 'In Progress'),

    M(high.id, '20263435', 'Ali', 'Guardianship',
      [],
      ['Prep evidence', 'Update costs agreement', 'Study guardianship apps and advise DE'],
      'Hearing 7 July 2026\nFile evidence before 23 June 2026', 'High', 'In Progress'),

    M(high.id, '20232829', '5 Sonder', 'Property',
      [],
      ['Waiting on response from client', 'File SOC once response received'],
      '', 'High', 'Waiting on Client'),

    M(high.id, '', 'Bost Design', 'Debt Recovery', [], [], '', 'Medium', 'Not Started'),

    M(high.id, '', 'R2B', 'Debt Recovery', [], [], '', 'Medium', 'Not Started'),

    M(high.id, '', 'Jadco', 'Debt Recovery',
      ['Get funds in trust', 'LOD'],
      ['Waiting on instructions'],
      '', 'High', 'Waiting on Client'),

    M(high.id, '20253361', 'Insulfiix', 'Debt Recovery',
      ['File Statement of Claim', 'Default judgement 19 February 2026',
       'Send updated costs disclosure for winding up proceedings', 'Serve stat demand'],
      ['Check in with clients if proceedings with winding up.', 'Requires funds in trust'],
      '', 'High', 'In Progress'),

    M(high.id, '20232846', 'Landcare', 'Home Building',
      ['File NCAT application - waiting on repair quote'],
      ['Get quote on expert report'],
      'Directions hearing - 12 June 2026', 'High', 'In Progress'),

    M(high.id, '20253174', 'Econ', 'Debt Recovery',
      [],
      ['Get update on what con wants to do when time'],
      '', 'Medium', 'In Progress'),

    M(high.id, '20253377', 'Samidesign', 'Debt Recovery',
      ['Email OS', 'Attempted service failed', 'No response from OS'],
      ['File evidence by 14 April 2026'],
      'Hearing on 7 December 2026 @ 2:00pm\nEvidence 14 days prior', 'High', 'In Progress'),

    // ---- RELLO -------------------------------------------------------------
    M(rello.id, '', '247 Agents', '',
      ['Prep winding-up application'],
      ['Send client payment terms agreement'],
      '', 'Medium', 'In Progress'),

    M(rello.id, '', 'DMS Marine', '',
      ['Garnishee NAB (has account)'],
      ['Potential winding-up', 'Waiting on client instructions (AFCA Complaint)'],
      '', 'Medium', 'Waiting on Client'),

    M(rello.id, '', 'Lyrical Enterprises', '',
      ['n/a'],
      ['Draft Acknowledgment of debt with caveatable interest', 'Waiting on client to forward searches'],
      '', 'Medium', 'Waiting on Client'),

    M(rello.id, '', 'Darren White', '',
      ['Judgement', 'Garnishee'],
      ['Waiting out'],
      '', 'Medium', 'Waiting on Other Side'),

    M(rello.id, '', 'Link Properties', '',
      [],
      ['Bankruptcy?'],
      '', 'Low', 'Not Started'),
  ].map((m, i) => ({ ...m, order: i }))

  return {
    meta: {
      title: 'WORK AGENDA',
      month: 'June 2026',
      names: ['Daniel Arthur Essey', 'Adrian James Elcham'],
    },
    sections: [high, rello],
    matters,
  }
}
