import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

const tasksOnDates: Record<number, { title: string; lead: string }[]> = {
  22: [
    { title: "Follow up with Vikram", lead: "Vikram Sharma (Vikram Enterprises)" },
    { title: "Send draft contract to Meera", lead: "Meera Das (PixelCraft)" },
  ],
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 22)); // April 22, 2026
  const [selectedDate, setSelectedDate] = useState(22);

  const monthName = new Date(currentDate.getFullYear(), currentDate.getMonth()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = [];
  const firstDay = firstDayOfMonth(currentDate);
  const daysCount = daysInMonth(currentDate);

  // Previous month days
  const prevMonthDays = daysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysCount; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }

  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Calendar</h1>
        <p className="text-muted-foreground">View your tasks and follow-ups by day</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="bg-card border-border p-6 lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-background rounded transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-background rounded transition-colors"
                title="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayObj, idx) => {
              const isSelected = dayObj.isCurrentMonth && dayObj.day === selectedDate;
              const hasTask = dayObj.isCurrentMonth && tasksOnDates[dayObj.day];
              const isToday = dayObj.isCurrentMonth && dayObj.day === 22;

              return (
                <button
                  key={idx}
                  onClick={() => dayObj.isCurrentMonth && setSelectedDate(dayObj.day)}
                  className={`p-2 rounded text-sm font-medium transition-colors relative ${
                    !dayObj.isCurrentMonth
                      ? "text-muted-foreground"
                      : isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-primary/20 text-foreground border-2 border-primary"
                      : hasTask
                      ? "bg-amber-500/20 text-foreground"
                      : "text-foreground hover:bg-background"
                  }`}
                >
                  {dayObj.day}
                  {hasTask && <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Tasks for Selected Date */}
        <Card className="bg-card border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">
            {currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </h3>

          <div className="space-y-3">
            {tasksOnDates[selectedDate] ? (
              tasksOnDates[selectedDate].map((task, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">For: {task.lead}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks on this date</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
