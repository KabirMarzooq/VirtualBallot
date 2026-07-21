import { useState, useEffect } from "react";
import { Building2, CheckCircle, Landmark } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  fetchBanks,
  resolveBankAccount,
  createOrgSubaccount,
  fetchOrgPaymentAccount,
} from "../../api";
import VBLoader from "../ui/VBLoader";

export default function PaymentSetup() {
  const { accessToken, orgSlug, showAlert, addLog } = useApp();

  const [banks, setBanks] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [acct, bankData] = await Promise.all([
          fetchOrgPaymentAccount(accessToken, orgSlug),
          fetchBanks(accessToken, orgSlug),
        ]);
        setConfigured(acct.configured);
        setExisting(acct);
        setBanks(bankData.banks);
      } catch (err) {
        showAlert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, orgSlug]);

  // Auto-resolve account name when 10 digits + bank chosen
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      setResolving(true);
      setAccountName("");
      resolveBankAccount(accountNumber, bankCode, accessToken, orgSlug)
        .then((d) => setAccountName(d.accountName))
        .catch(() => setAccountName(""))
        .finally(() => setResolving(false));
    }
  }, [accountNumber, bankCode]);

  const handleSave = async () => {
    if (!businessName.trim() || !bankCode || accountNumber.length !== 10) {
      return showAlert(
        "Incomplete",
        "Fill business name, bank, and a valid 10-digit account number."
      );
    }
    setSaving(true);
    try {
      await createOrgSubaccount(
        {
          businessName: businessName.trim(),
          bankCode,
          bankName,
          accountNumber,
        },
        accessToken,
        orgSlug
      );
      addLog("Payment account configured", "admin");
      setConfigured(true);
      setExisting({
        businessName: businessName.trim(),
        bankName,
        accountNumber,
      });
      showAlert(
        "Done",
        "Your payout account is set up. Paid votes will settle here."
      );
    } catch (err) {
      showAlert("Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full min-h-[44px] text-[13px] text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 transition-all";

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <VBLoader size="md" />
      </div>
    );
  }

  if (configured && existing) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold text-green-600 uppercase tracking-[0.08em] flex items-center gap-1.5 mb-2">
          <CheckCircle className="w-3.5 h-3.5" /> Payout account active
        </p>
        <p className="text-[13px] font-semibold text-slate-900">
          {existing.businessName}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {existing.bankName} ·{" "}
          <span className="font-mono">{existing.accountNumber}</span>
        </p>
        <p className="text-[11px] leading-4 text-slate-600 mt-2">
          Paid-vote earnings settle directly to this account.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-1.5 mb-2">
        <Landmark className="w-3.5 h-3.5 text-blue-600" /> Payout account ·
        paid voting
      </p>
      <p className="text-[11px] leading-4 text-slate-600 mb-4">
        Vote payments settle straight to your bank account. Virtual Ballot
        takes nothing — voters cover the small Paystack processing fee.
      </p>

      <div className="mb-3">
        <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
          Business / account name
        </label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. NUESA Faculty Account"
          className={inputClass}
        />
      </div>

      <div className="mb-3">
        <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
          Bank
        </label>
        <select
          value={bankCode}
          onChange={(e) => {
            setBankCode(e.target.value);
            setBankName(e.target.options[e.target.selectedIndex].text);
          }}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">Select bank…</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-[13px] leading-5 font-medium text-slate-600 mb-2">
          Account number
        </label>
        <input
          value={accountNumber}
          onChange={(e) =>
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="10-digit account number"
          className={`${inputClass} font-mono`}
        />
        {resolving && (
          <p className="text-[11px] text-slate-600 mt-1.5">
            Verifying account…
          </p>
        )}
        {accountName && (
          <p className="text-[11px] font-semibold text-green-600 mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {accountName}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !accountName}
        title={
          accountName
            ? "Save this payout account"
            : "Enter a bank and 10-digit account number to verify first"
        }
        className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        {saving ? (
          <VBLoader size="sm" />
        ) : (
          <>
            <Building2 className="w-4 h-4" /> Save payout account
          </>
        )}
      </button>
      {!accountName && !resolving && (
        <p className="text-[11px] leading-4 text-slate-400 text-center mt-2">
          The save button unlocks once the account name is verified.
        </p>
      )}
    </div>
  );
}
