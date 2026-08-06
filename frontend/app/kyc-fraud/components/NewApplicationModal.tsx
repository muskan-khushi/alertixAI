"use client";

import { useState, useEffect } from "react";
import { X, FileCheck, ChevronDown } from "lucide-react";
import { ApplicationInput, submitToIdentityGraphService, KycApplicant } from "@/lib/kycFraudData";

interface Props {
  onClose: () => void;
  onSubmit: (applicant: KycApplicant) => void;
  ghostDemoScenario?: string | null;
}

const FIELD_META: { key: keyof ApplicationInput; label: string; placeholder: string; required: boolean }[] = [
  { key: "name", label: "Full name", placeholder: "As on submitted ID", required: true },
  { key: "phone", label: "Phone number", placeholder: "9XXXXXXXXX", required: true },
  { key: "address", label: "Address", placeholder: "Street, city", required: true },
  { key: "deviceId", label: "Device ID", placeholder: "Captured from onboarding session", required: true },
  { key: "ipAddress", label: "IP address", placeholder: "Captured from onboarding session", required: true },
  { key: "faceRef", label: "Face scan reference", placeholder: "From liveness capture", required: true },
  { key: "bankAccount", label: "Linked bank account (optional)", placeholder: "If provided at onboarding", required: false },
];

export default function NewApplicationModal({ onClose, onSubmit, ghostDemoScenario }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

  const canSubmitManual = FIELD_META.filter((f) => f.required).every((f) => (form[f.key] ?? "").trim().length > 0);

  const handleManualSubmit = async () => {
    if (!canSubmitManual) return;
    setStage("Verifying document authenticity…");
    const applicant = await submitToIdentityGraphService(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        deviceId: form.deviceId.trim(),
        ipAddress: form.ipAddress.trim(),
        faceRef: form.faceRef.trim(),
        bankAccount: form.bankAccount?.trim() || undefined,
      },
      "manual_submission",
      false,
      setStage
    );
    setStage(null);
    onSubmit(applicant);
  };

  useEffect(() => {
    if (!ghostDemoScenario) {
      setManualOpen(true);
      return;
    }

    setManualOpen(true);

    const runGhostTyping = async () => {
      let demoData = {
        name: "Rahul Verma (Synthetic)",
        phone: "999-999-9999",
        address: "123 Link Road, Mumbai",
        deviceId: "device_999",
        ipAddress: "192.168.77.5",
        faceRef: "face_hash_123",
      };
      
      let isBurst = false;

      if (ghostDemoScenario === "clean") {
        demoData = {
          name: "Aarohi Desai (Legitimate)",
          phone: "987-654-3210",
          address: "456 MG Road, Bengaluru",
          deviceId: "device_clean_001",
          ipAddress: "198.51.100.22",
          faceRef: "face_hash_clean_1",
        };
      } else if (ghostDemoScenario === "device_match") {
        demoData = {
          name: "Vikram Singh (Account Takeover)",
          phone: "912-345-6789",
          address: "789 FC Road, Pune",
          deviceId: "dvc_a11", // Known bad device from DEMO_MATCH_HINTS
          ipAddress: "203.0.113.44",
          faceRef: "face_hash_bob_1",
        };
      } else if (ghostDemoScenario === "high_severity") {
        demoData = {
          name: "Rohan Sharma (Fraud Ring)",
          phone: "999-888-7777",
          address: "101 Sector 15, Noida",
          deviceId: "dvc_a11", // Known bad device
          ipAddress: "106.24.9.43", // Known bad IP
          faceRef: "face_clu_a1", // Known bad face
        };
        isBurst = true;
      }

      const fields = Object.entries(demoData);
      
      let currentForm = { ...form };
      
      for (const [key, value] of fields) {
        let typed = "";
        for (let i = 0; i < value.length; i++) {
          await new Promise(r => setTimeout(r, 40));
          typed += value[i];
          currentForm = { ...currentForm, [key]: typed };
          setForm(currentForm);
        }
        await new Promise(r => setTimeout(r, 100));
      }

      await new Promise(r => setTimeout(r, 400));
      
      setStage("Verifying document authenticity…");
      const applicant = await submitToIdentityGraphService(
        demoData,
        "manual_submission",
        isBurst, 
        setStage
      );
      setStage(null);
      onSubmit(applicant);
    };

    runGhostTyping();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostDemoScenario]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md glass-card-strong border-l border-border z-50 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur-md z-10">
          <div>
            <p className="text-[10px] text-faint tracking-label mb-1">Onboarding</p>
            <h2 className="text-lg font-medium text-ink">New Application</h2>
          </div>
          <button onClick={onClose} className="text-mist hover:text-ink glass-card p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {stage ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm text-mist font-mono">{stage}</p>
            </div>
          ) : (
            <>
              <div className="pt-2">
                <button
                  onClick={() => setManualOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-mist hover:text-ink mb-4"
                >
                  <ChevronDown size={13} className={`transition-transform ${manualOpen ? "rotate-180" : ""}`} />
                  Manual analyst entry
                </button>

                {manualOpen && (
                  <div className="space-y-4">
                    {FIELD_META.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs text-mist mb-1.5 block">
                          {f.label}
                          {f.required && <span className="text-danger ml-0.5">*</span>}
                        </label>
                        <input
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full rounded-lg border border-border bg-void px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleManualSubmit}
                      disabled={!canSubmitManual}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-black text-sm font-medium py-3 hover:bg-brand/90 disabled:opacity-40 transition-colors"
                    >
                      <FileCheck size={15} />
                      Submit for verification
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}