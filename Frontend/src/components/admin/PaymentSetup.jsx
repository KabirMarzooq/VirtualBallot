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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <VBLoader size="md" />
      </div>
    );
  }

  if (configured && existing) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5 border border-green-700/40">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <p className="text-xs font-bold text-green-400 uppercase tracking-widest">
            Payout Account Active
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-white font-bold">{existing.businessName}</p>
          <p className="text-slate-400">
            {existing.bankName} · {existing.accountNumber}
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Paid-vote earnings settle directly to this account.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-blue-400" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Payout Account · Paid Voting
        </p>
      </div>
      <p className="text-xs text-slate-400">
        Vote payments settle straight to your bank account. Virtual Ballot takes
        nothing — voters cover the small Paystack processing fee.
      </p>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
          Business / Account Name
        </label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. NUESA Faculty Account"
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
          Bank
        </label>
        <select
          value={bankCode}
          onChange={(e) => {
            setBankCode(e.target.value);
            setBankName(e.target.options[e.target.selectedIndex].text);
          }}
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Select bank…</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
          Account Number
        </label>
        <input
          value={accountNumber}
          onChange={(e) =>
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="10-digit account number"
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
        />
        {resolving && (
          <p className="text-xs text-slate-500 mt-1.5">Verifying account…</p>
        )}
        {accountName && (
          <p className="text-xs text-green-400 font-bold mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {accountName}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !accountName}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
      >
        {saving ? (
          <VBLoader size="sm" />
        ) : (
          <>
            <Building2 className="w-4 h-4" /> Save Payout Account
          </>
        )}
      </button>
    </div>
  );
}
