"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Badge, Button, Textarea, Input } from "@/components/UI";
import ReplyForm from "./ReplyForm";

interface Faq {
  _id: string;
  question: string;
  answer: string;
}

interface Inquiry {
  _id: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  reply?: string;
  createdAt: string;
}

export default function SupportPage() {
  const t = useTranslations("support");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"faq" | "inquiries" | "new">("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // New inquiry form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [faqRes, inquiryRes, meRes] = await Promise.all([
          fetch("/api/support/faq"),
          fetch("/api/support/inquiries"),
          fetch('/api/me'),
        ]);

        if (faqRes.ok) {
          const data = await faqRes.json();
          setFaqs(data.faqs || []);
        }

        let inquiriesData: any = [];
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUser(me.user || null);
          // if admin/instructor, fetch all inquiries
          if (me.user && (me.user.role === 'superadmin' || me.user.role === 'instructor')) {
            const allRes = await fetch('/api/support/inquiries?all=true');
            if (allRes.ok) {
              const d = await allRes.json();
              inquiriesData = d.inquiries || [];
            }
          } else {
            if (inquiryRes.ok) {
              const data = await inquiryRes.json();
              inquiriesData = data.inquiries || [];
            }
          }
        } else {
          if (inquiryRes.ok) {
            const data = await inquiryRes.json();
            inquiriesData = data.inquiries || [];
          }
        }

        setInquiries(inquiriesData);
      } catch (error) {
        console.error("Error fetching support data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/support/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      if (res.ok) {
        const data = await res.json();
        setInquiries([data.inquiry, ...inquiries]);
        setSubject("");
        setMessage("");
        setActiveTab("inquiries");
      } else {
        const error = await res.json();
        alert(error.message || "Failed to submit inquiry");
      }
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      alert("Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusTone = (status: string): "green" | "orange" | "gray" => {
    switch (status) {
      case "answered":
        return "green";
      case "open":
        return "orange";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-gray-600">Loading support...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("faq")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "faq"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          FAQ ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab("inquiries")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "inquiries"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Inquiries ({inquiries.length})
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "new"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Submit Inquiry
        </button>
      </div>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <>
          {faqs.length === 0 ? (
            <Card>
              <p className="text-gray-500">No FAQs available yet.</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {faqs.map((faq) => (
                <Card key={faq._id} className="cursor-pointer">
                  <div
                    onClick={() =>
                      setExpandedFaq(expandedFaq === faq._id ? null : faq._id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{faq.question}</h3>
                      <span className="text-gray-400">
                        {expandedFaq === faq._id ? "−" : "+"}
                      </span>
                    </div>
                    {expandedFaq === faq._id && (
                      <p className="mt-3 text-gray-600 border-t pt-3">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Inquiries Tab */}
      {activeTab === "inquiries" && (
        <>
          {inquiries.length === 0 ? (
            <Card>
              <p className="text-gray-500">You haven&apos;t submitted any inquiries yet.</p>
              <button
                onClick={() => setActiveTab("new")}
                className="mt-3 text-blue-600 hover:underline"
              >
                Submit your first inquiry
              </button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inquiries.map((inquiry) => (
                <Card key={inquiry._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{inquiry.subject}</h3>
                        <Badge tone={getStatusTone(inquiry.status)}>
                          {inquiry.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{inquiry.message}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        Submitted: {new Date(inquiry.createdAt).toLocaleDateString()}
                      </p>

                      {inquiry.reply && (
                        <div className="mt-4 rounded bg-blue-50 p-3">
                          <p className="text-sm font-medium text-blue-800">Response:</p>
                          <p className="mt-1 text-sm text-blue-700">{inquiry.reply}</p>
                        </div>
                      )}

                      {/* Admin / Instructor reply form */}
                      {currentUser && (currentUser.role === 'superadmin' || currentUser.role === 'instructor') && inquiry.status === 'open' && (
                        <ReplyForm inquiryId={inquiry._id} onReplied={(updated) => {
                          setInquiries(inquiries.map(i => i._id === updated._id ? updated : i));
                        }} />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Inquiry Tab */}
      {activeTab === "new" && (
        <Card>
          <h3 className="mb-4 font-semibold">Submit a New Inquiry</h3>
          <form onSubmit={handleSubmitInquiry} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is your inquiry about?"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question in detail..."
                rows={5}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Inquiry"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
