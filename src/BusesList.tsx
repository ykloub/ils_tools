import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import debounce from "lodash/debounce";
import discardData from "./Bus_Discarding.json";
import "./InventoryList.css";

interface BusItem {
  Barcode: string;
  Title: string;
  Contributors: string;
  correct: boolean;
}

const BusDiscarding: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [localStorageData, setLocalStorageData] = useState<BusItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem("busTableData");
    if (storedData) {
      setLocalStorageData(JSON.parse(storedData));
    }
  }, []);

  const handleSearch = debounce((term: string) => {
    if (term) {
      const foundItem = discardData.BusesItems.find(
        (item) => item.Barcode === term
      );

      if (foundItem) {
        const newItem = {
          Barcode: foundItem.Barcode,
          Title: foundItem.Title,
          Contributors: foundItem.Contributors || "N/A", // Default to 'N/A' if undefined
          correct: true,
        };

        const isDuplicate = localStorageData.some(
          (item) => item.Barcode === newItem.Barcode
        );

        if (isDuplicate) {
          const index = localStorageData.findIndex(
            (item) => item.Barcode === newItem.Barcode
          );
          scrollToAndHighlight(index);
          setMessage(null); // Clear any existing message
        } else {
          const updatedData = [newItem, ...localStorageData];
          setLocalStorageData(updatedData);
          localStorage.setItem("busTableData", JSON.stringify(updatedData));
          setMessage(null); // Clear any existing message
        }
      } else {
        // Show the barcode that was entered in the error message
        setMessage(`Barcode "${term}" does not exist in discard list`);
      }

      // Clear the input field after search
      setSearchTerm("");
    }
  }, 300); // Debounce with 500 milliseconds delay

  // Handle input change and call the debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    handleSearch(e.target.value); // Calls the debounced search function
  };

  const scrollToAndHighlight = (index: number) => {
    const element = document.getElementById(`row-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      element.classList.add("highlighted");
      setTimeout(() => {
        element.classList.remove("highlighted");
      }, 2000); // Blink for 2 seconds
    }
  };

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(localStorageData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buses");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "bus_discarding_" + new Date().toISOString() + ".xlsx");
  };

  const handleToggleCorrect = (barcode: string) => {
    const updatedItems = localStorageData.map((item) =>
      item.Barcode === barcode ? { ...item, correct: !item.correct } : item
    );
    setLocalStorageData(updatedItems);
    localStorage.setItem("busTableData", JSON.stringify(updatedItems));
  };

  const handleClearTable = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear the entire table?"
    );
    if (confirmed) {
      setLocalStorageData([]);
      localStorage.removeItem("busTableData");
    }
  };

  return (
    <div className="App">
      <input
        type="text"
        placeholder="Scan barcode..."
        value={searchTerm}
        onChange={handleInputChange} // Calls the handleInputChange function
      />
      <button className="btn btn-info" onClick={handleDownloadExcel}>
        Download as Excel
      </button>
      <button className="btn btn-danger" onClick={handleClearTable}>
        Clear Table
      </button>
      {message && <p style={{ color: "red" }}>{message}</p>}
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Title</th>
            <th>Author</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          {localStorageData.map((item, index) => (
            <tr key={index} id={`row-${index}`}>
              <td>{item.Barcode}</td>
              <td>{item.Title}</td>
              <td>{item.Contributors}</td>
              <td>
                {/* {item.correct} */}
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={item.correct}
                    onChange={() => handleToggleCorrect(item.Barcode)}
                  />
                  <span className="slider round">{item.correct ? "" : ""}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BusDiscarding;
