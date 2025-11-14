**CycleSync**
_A cycle-aware training planner for people with menstrual cycles._
<br /> <p align="center"> <img src="https://img.shields.io/badge/Next.js-000?logo=nextdotjs" /> <img src="https://img.shields.io/badge/React-20232A?logo=react" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript" /> <img src="https://img.shields.io/badge/TailwindCSS-38bdf8?logo=tailwindcss" /> <img src="https://img.shields.io/badge/shadcn/ui-black?logo=shadcnui" /> </p> <br />

CycleSync is a cycle-aware training planner that helps people with menstrual cycles organize weekly workouts, log daily performance, and understand patterns across hormonal phases.

Originally created for pole, strength training, and functional fitness, CycleSync is designed for anyone whose performance fluctuates across their cycle, regardless of gender identity. If you have a cycle — this app is built with you in mind.

**Why CycleSync?**

Most fitness apps assume that performance, energy, and recovery are stable week to week. But for cyclical athletes, that simply isn’t true. Hormonal shifts influence strength, motivation, endurance, sleep, and recovery.

CycleSync helps you train in alignment with your physiology, not against it:

- Plan smarter

- Adjust intensity intuitively

- Track energy, RPE, and sleep

- Identify patterns across cycle phases

- Prevent burnout

- Celebrate your natural rhythm

No gendered assumptions. No medicalization. Just data-driven awareness and supportive design.

**Features**

_Weekly Training Planner_

- Add planned sessions

- Set weekly goals & intentions

- Tag each week by cycle phase

- Visual clarity for load balancing

_Daily Log_

- Planned vs Actual sessions

- Energy, RPE, Sleep (nullable)

- Free-form notes

- Smooth, intuitive UX

_Insights Dashboard_

- Phase-based averages

- Shows per-metric entry counts

- Gracefully displays “no data yet”

- Builds long-term self-awareness

_Local & Private_

- Uses LocalStorage

- No backend

- No account needed

- All data stays on your device

_Modern UI_

- Clean design using shadcn/ui

- Responsive TailwindCSS

- Smooth interactions

- Thoughtful layout


__Tech Stack__

- Next.js (App Router)

- React

- TypeScript

- TailwindCSS

- shadcn/ui

- LocalStorage persistence

- Zero backend for now

__Getting Started__

npm install
npm run dev


Then visit:

http://localhost:3000

**Project Structure**

src/
  app/
    page.tsx          # Main interface
  components/ui/       # shadcn components
  lib/                 # utilities
public/


**Developed by**

Caprice Sola
GitHub: @caprice-sola

**License**

MIT License
Feel free to fork, explore, and build upon CycleSync.
