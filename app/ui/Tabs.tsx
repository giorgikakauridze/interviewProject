import React from "react";
import { setFilteredCookie } from "../lib/actions";
import { cookies } from "next/headers";

const Tabs = () => {
  const filters = ["All", "cancelled", "pending", "paid", "overdue"];
  const filteredCookie = cookies().get("filter")?.value || "All";
  return (
    <div className="flex justify-end gap-20 py-10 px-2">
      {filters.map((filter, i) => {
        const activeFilter =
          filteredCookie.toLowerCase() === filter.toLowerCase();

        return (
          <form action={setFilteredCookie} key={i}>
            <button
              name="filter"
              value={filter}
              key={i}
              id="filter"
              className={`px-5 w-20 rounded-xl py-2 cursor-pointer ${
                activeFilter ? "bg-slate-500 text-white" : ""
              }`}
            >
              {filter}
            </button>
          </form>
        );
      })}
    </div>
  );
};

export default Tabs;
