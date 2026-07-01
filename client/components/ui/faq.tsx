import React from 'react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';

import { Typography } from "@/components/ui/typography";

interface FaqsSectionProps {
	title?: string;
	subtitle?: string;
	faqs?: Array<{ question: string; answer: string }>;
}

export function FaqsSection({ title, subtitle, faqs }: FaqsSectionProps = {}) {
	const displayTitle = title || "Frequently Asked Questions";
	const displaySubtitle = subtitle || "Here are some common questions and answers about how Reunait helps find missing persons. If you don't find what you are looking for, feel free to reach out to our team.";

	const displayQuestions = faqs && faqs.length > 0
		? faqs.map((f, idx) => ({ id: `item-${idx + 1}`, title: f.question, content: f.answer }))
		: questions;

	return (
		<section className="pt-20 pb-[60px] bg-background relative overflow-hidden">
			{/* Decorative background gradients */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-emerald-500/5 dark:bg-emerald-500/3 rounded-full blur-3xl" />
				<div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-80 h-80 bg-primary/5 dark:bg-primary/3 rounded-full blur-3xl" />
			</div>

			<div className="mx-auto w-full max-w-3xl space-y-8 px-4 relative z-10">
				<div className="text-center mb-16">
					<Typography variant="h2" as="h2" className="text-4xl font-bold mb-6">
						{displayTitle}
					</Typography>
					<Typography variant="lead" className="text-xl text-muted-foreground max-w-2xl mx-auto">
						{displaySubtitle}
					</Typography>
				</div>
				<Accordion
					type="single"
					collapsible
					className="bg-card/40 dark:bg-card/25 backdrop-blur-sm w-full -space-y-px rounded-xl border border-border/60 overflow-hidden shadow-sm"
				>
					{displayQuestions.map((item) => (
						<AccordionItem
							value={item.id}
							key={item.id}
							className="relative border-x first:rounded-t-xl first:border-t last:rounded-b-xl last:border-b border-border/40 hover:border-emerald-500/20 dark:hover:border-emerald-400/10 transition-colors duration-200"
						>
							<AccordionTrigger className="px-5 py-4 sm:px-6 sm:py-5 text-base sm:text-lg font-semibold tracking-tight hover:no-underline [&[data-state=open]]:text-primary transition-colors duration-200">
								{item.title}
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground pb-5 px-5 sm:px-6 text-sm sm:text-base leading-relaxed border-t border-border/10 pt-4 bg-muted/10 dark:bg-muted/5">
								{item.content}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
				<p className="text-muted-foreground text-sm text-center">
					Can't find what you're looking for? Contact our{' '}
					<a href="/contact" className="text-primary hover:underline font-medium">
						customer support team
					</a>
				</p>
			</div>
		</section>
	);
}

const questions = [
	{
		id: 'item-1',
		title: 'How does Reunait help find missing people?',
		content:
			'Reunait compares photos of missing individuals with sightings uploaded by families, NGOs, police, our verified volunteer network, and the public. When you search or register a case, our AI algorithm checks visual details against all registered cases within your country to instantly identify similarities, helping connect families.',
	},
	{
		id: 'item-2',
		title: 'What should I do if I see someone who appears lost?',
		content:
			'First, assist them to the nearest NGO or police station to register an official report, as you will need an official case or report number to register them on Reunait. Then, click "Register Case" on our platform, select the "Found" option, upload clear photos of their face, and provide a detailed description. This allows families to instantly match details and establish contact.',
	},
	{
		id: 'item-3',
		title: 'Is there a fee to report a case or search the database?',
		content:
			'No. As a computer science enthusiast and the sole developer behind Reunait, I started this platform as a personal college project dedicated to finding missing people in India. After seeing the profound impact it had, I scaled it into a global cause. Although running a global matching network single-handedly carries significant server and hosting costs, I will try my absolute best to keep the platform free.',
	},
	{
		id: 'item-4',
		title: 'How is my family’s privacy and data protected?',
		content:
			'Privacy is our highest priority. We process photos securely and solely for the purpose of matching faces in missing person reports. We do not sell personal data to third parties, and all case details are strictly protected under industry-standard security safeguards.',
	},
	{
		id: 'item-5',
		title: 'How does everyone collaborate and use Reunait?',
		content:
			'Anyone can browse active cases on the platform. If you grant location permission, Reunait automatically highlights active cases in your immediate area, and you can customize your search using filters like date and location. If you have information about a case, you can submit details directly on the platform—either anonymously or with your contact details if you are willing to help further. You can also share these sightings directly with the nearest police station or local NGO.',
	},
	{
		id: 'item-6',
		title: 'Can I find someone who has been missing for a long time if I only have old photos?',
		content:
			'Yes. Our AI algorithm is smart and capable enough to identify matches even with significant changes in facial features over time. It focuses on permanent structural details of the face that remain relatively stable as a person grows. When registering a case with older photos, we also recommend providing a detailed description of any permanent identifying marks—such as birthmarks, scars, tattoos, or unique physical characteristics. This combination of visual matching and detailed descriptions helps our system identify potential matches even after years have passed.',
	},
	{
		id: 'item-7',
		title: 'How many AI searches can I perform, and why is there a limit?',
		content:
			'To optimize system performance and manage database resources, general users can perform an AI match search on a specific case once every 4 hours (up to 6 times per day). This cooldown limit is completely waived for verified police, NGO, and volunteer accounts, who can perform search scans without any restrictions.',
	},
	{
		id: 'item-8',
		title: 'What should I do if I see photos or details on the platform that are not suitable?',
		content:
			'If you encounter any inappropriate photos, false details, or unsuitable content, you can click the Flag icon on that case detail page. Once flagged, our system registers the report for immediate review. If the content violates our guidelines, the listing is hidden from public view, and our moderation network (consisting of verified volunteers and law enforcement) will verify and take final action on the report.',
	},
];
