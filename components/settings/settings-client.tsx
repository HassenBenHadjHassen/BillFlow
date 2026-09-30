"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings, Building2, User, Lock, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateCompanySettingsAction } from "@/actions/settings.actions";
import { updateProfileAction, changePasswordAction } from "@/actions/auth.actions";
import { useToast } from "@/components/ui/toast";
import { CompanySettingsDTO, UserSession } from "@/types";

export function SettingsClient({
  settings,
  user,
}: {
  settings: CompanySettingsDTO;
  user: UserSession;
}) {
  const router = useRouter();
  const { toast } = useToast();

  // Company Settings State
  const [isSavingCompany, setIsSavingCompany] = React.useState(false);
  const [companyName, setCompanyName] = React.useState(settings.companyName);
  const [address, setAddress] = React.useState(settings.address || "");
  const [city, setCity] = React.useState(settings.city || "");
  const [postalCode, setPostalCode] = React.useState(settings.postalCode || "");
  const [country, setCountry] = React.useState(settings.country || "France");
  const [email, setEmail] = React.useState(settings.email || "");
  const [phone, setPhone] = React.useState(settings.phone || "");
  const [website, setWebsite] = React.useState(settings.website || "");
  const [siret, setSiret] = React.useState(settings.siret || "");
  const [vatNumber, setVatNumber] = React.useState(settings.vatNumber || "");
  const [iban, setIban] = React.useState(settings.iban || "");
  const [bic, setBic] = React.useState(settings.bic || "");
  const [defaultCurrency, setDefaultCurrency] = React.useState(settings.defaultCurrency || "EUR");
  const [defaultTaxRate, setDefaultTaxRate] = React.useState(settings.defaultTaxRate);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = React.useState(settings.defaultPaymentTerms);
  const [invoicePrefix, setInvoicePrefix] = React.useState(settings.invoicePrefix || "INV");
  const [invoiceNotes, setInvoiceNotes] = React.useState(settings.invoiceNotes || "");

  // Profile State
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [userName, setUserName] = React.useState(user.name);
  const [userEmail, setUserEmail] = React.useState(user.email);

  // Password State
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);

    try {
      const res = await updateCompanySettingsAction({
        companyName,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || "France",
        email: email || null,
        phone: phone || null,
        website: website || null,
        siret: siret || null,
        vatNumber: vatNumber || null,
        iban: iban || null,
        bic: bic || null,
        defaultCurrency,
        defaultTaxRate: Number(defaultTaxRate),
        defaultPaymentTerms: Number(defaultPaymentTerms),
        invoicePrefix,
        invoiceNotes: invoiceNotes || null,
      });

      if (res.success) {
        toast({ title: "Company Settings Saved", description: "Invoices will reflect the new settings.", type: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const res = await updateProfileAction({ name: userName, email: userEmail });
      if (res.success) {
        toast({ title: "Profile Updated", description: "Your account details were saved.", type: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);

    try {
      const res = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
      if (res.success) {
        toast({ title: "Password Changed", description: "Your password was updated securely.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Business &amp; Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure business identity, legal metadata for invoice generation, banking coordinates, and owner credentials.
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Company &amp; Invoicing
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <User className="h-4 w-4" /> Owner Account &amp; Password
          </TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company">
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>
                  This information appears as the issuing company on all generated PDF invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Name *</label>
                    <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing Email</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website</label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Country</label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Street Address</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Postal Code</label>
                    <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal &amp; Banking Information</CardTitle>
                <CardDescription>
                  Registration numbers and wire instructions printed on invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SIRET</label>
                    <Input placeholder="849 123 456 00018" value={siret} onChange={(e) => setSiret(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">VAT Number</label>
                    <Input placeholder="FR 12 849123456" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">IBAN</label>
                    <Input placeholder="FR76 3000 ..." value={iban} onChange={(e) => setIban(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">BIC / SWIFT</label>
                    <Input placeholder="BNPAFRPP" value={bic} onChange={(e) => setBic(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Numbering &amp; Defaults</CardTitle>
                <CardDescription>
                  Configure prefix formatting and standard commercial terms.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Prefix</label>
                    <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Currency</label>
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default VAT Rate (%)</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Invoice Terms / Notes</label>
                    <textarea
                      rows={3}
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isSavingCompany} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Save className="h-4 w-4" /> Save Company Settings
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Owner Account Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Profile Name & Email */}
          <form onSubmit={handleSaveProfile}>
            <Card>
              <CardHeader>
                <CardTitle>Owner Profile</CardTitle>
                <CardDescription>
                  Your primary administrator account details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your Full Name *</label>
                    <Input required value={userName} onChange={(e) => setUserName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Login Email *</label>
                    <Input type="email" required value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" isLoading={isSavingProfile}>
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Change Password */}
          <form onSubmit={handleSavePassword}>
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Requires your current password to authorize a password change.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password *</label>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password *</label>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm Password *</label>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" variant="destructive" isLoading={isSavingPassword}>
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
