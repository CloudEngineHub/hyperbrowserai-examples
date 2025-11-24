import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";

config();

interface BookingDetails {
  date: string;
  time: string;
  name: string;
  email: string;
  service: string;
}

async function bookAppointment(details: BookingDetails) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://calendly.com/aparup2003/30min");

  await page.waitForTimeout(2000);

  await page.aiAction("click the book appointment button");

  await page.waitForTimeout(2000);

  await page.aiAction(`select ${details.date} from the calendar`);
  await page.aiAction(`select ${details.time} time slot`);
  await page.aiAction("click the next button");

  await page.waitForTimeout(2000);

  await page.aiAction(`fill the name field with ${details.name}`);
  await page.aiAction(`fill the email field with ${details.email}`);
  await page.aiAction(`select ${details.service} from service options`);

  await page.aiAction("click the confirm booking button");

  await page.waitForTimeout(2000);

  console.log("Appointment booked successfully!");

  await agent.closeAgent();
}

const bookingDetails: BookingDetails = {
  date: "December 15, 2025",
  time: "2:00 PM",
  name: "Michael Chen",
  email: "michael.chen@example.com",
  service: "Consultation",
};

bookAppointment(bookingDetails);

