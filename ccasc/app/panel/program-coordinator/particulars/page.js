"use client";

import * as React from "react";
import { CoordinatorParticularsScreen } from "@/components/coordinator-particulars-screen";

/**
 * Program Coordinator — Sports Complex: particulars module.
 *
 * The stock half of the coordinator's job: restock, report damage, review the
 * restock / damage history of a particular, and jump to the printable
 * Particulars Stock Report. The admin Particulars Management page stays the only
 * place particulars are created, edited, archived or deleted.
 */
export default function CoordinatorParticularsPage() {
  return (
    <CoordinatorParticularsScreen
      reportsHref="/panel/program-coordinator/particulars/reports"
      scopeNote="Program Coordinator — Sports Complex. This module maintains the shared particulars stock: every restocking and damage report you record is logged under your name and is included in the Particulars Stock Report you can generate from this page."
    />
  );
}
