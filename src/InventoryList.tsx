import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import LoadingOverlay from "./LoadingOverlay";
import "./InventoryList.css";

// Define types for the item data
interface Item {
  barcode: string;
  hrid: string;
  title: string;
  author: string;
  status: string;
  correct: boolean;
  addedDateTime: string;
  permanentLocationId: string;
  holdingsRecordId: string;
}

interface HoldingSummary {
  hid: string;
  title: string;
  author: string;
  totalItems: number;
  scannedItems: number;
  status: string;
  cleared: boolean;
}

const InventoryList: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [holdingSummary, setHoldingSummary] = useState<HoldingSummary[]>([]);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string>("");
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null); // For blinking animation
  const highlightedRef = useRef<HTMLTableRowElement | null>(null); // Reference for the highlighted row
  const tableContainerRef = useRef<HTMLDivElement | null>(null); // Reference for the table container
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timer
    if (timer) {
      clearTimeout(timer);
    }

    // Set new debounce timer
    setTimer(
      setTimeout(async () => {
        const holdingsRecordId = await fetchItems(value);
        if (holdingsRecordId) {
          // Only fetch holding details if holdingsRecordId is valid
          await fetchHoldingDetails(holdingsRecordId);
        }
      }, 300)
    );
  };

  const fetchItems = async (barcode: string): Promise<string | null> => {
    try {
      setIsLoading(true);

      const existingItemIndex = items.findIndex(
        (item) => item.barcode === barcode
      );

      if (existingItemIndex !== -1) {
        setHighlightedItem(items[existingItemIndex].barcode);
        setTimeout(() => setHighlightedItem(null), 3000);
        setQuery("");
        setError("");
        setIsLoading(false);
        return null; // Return null if item already exists
      }

      const response = await axios.get(
        `https://okapi-uae-cls01.ils.medad.com/inventory/items?query=barcode==${barcode}`,
        {
          headers: {
            "x-okapi-tenant": "dctuae",
            "x-okapi-token":
              "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkY3RfYWRtaW4iLCJ0eXBlIjoibGVnYWN5LWFjY2VzcyIsInVzZXJfaWQiOiIwNTIzZjNjMC0zMjk3LTQ4MzYtYWI0MC1iMWZiZjRmMmEyNGUiLCJpYXQiOjE3MTgxNjY2NDIsInRlbmFudCI6ImRjdHVhZSJ9.DXvfYPEFns-7n86J2oyZc-9yPahsdC7u2yeLLkmBzHQ", // Replace with your token
          },
        }
      );

      if (response.data.items && response.data.items.length > 0) {
        const item = response.data.items[0];
        const newItem: Item = {
          barcode: item.barcode,
          hrid: item.hrid,
          title: item.title,
          author: item.contributorNames[0].name,
          status: item.status.name,
          correct: true,
          addedDateTime: new Date().toLocaleString(),
          permanentLocationId: item.permanentLocation.id,
          holdingsRecordId: item.holdingsRecordId,
        };

        const updatedItems = [newItem, ...items];
        setItems(updatedItems);
        localStorage.setItem("inventoryItems", JSON.stringify(updatedItems));
        setQuery("");
        setError("");
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }

        setIsLoading(false);
        return item.holdingsRecordId; // Return holdingsRecordId if fetch was successful
      } else {
        setError("No item found for the given barcode.");
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      setError("Error fetching items. Please try again.");
      setIsLoading(false);
      return null; // Return null if there was an error
    }
  };

  const fetchHoldingDetails = async (holdingsRecordId: string) => {
    try {
      const response = await axios.get(
        `https://okapi-uae-cls01.ils.medad.com/inventory/items-by-holdings-id?offset=0&limit=200&query=holdingsRecordId==${holdingsRecordId}+sortby+barcode/sort.ascending`,
        {
          headers: {
            "x-okapi-tenant": "dctuae",
            "x-okapi-token":
              "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkY3RfYWRtaW4iLCJ0eXBlIjoibGVnYWN5LWFjY2VzcyIsInVzZXJfaWQiOiIwNTIzZjNjMC0zMjk3LTQ4MzYtYWI0MC1iMWZiZjRmMmEyNGUiLCJpYXQiOjE3MTgxNjY2NDIsInRlbmFudCI6ImRjdHVhZSJ9.DXvfYPEFns-7n86J2oyZc-9yPahsdC7u2yeLLkmBzHQ", // Replace with your token
          },
        }
      );

      const totalItems = response.data.totalRecords;

      // Load stored items from localStorage
      const storedItems: Item[] = JSON.parse(
        localStorage.getItem("inventoryItems") || "[]"
      );

      // Calculate the number of scanned items for this holdingsRecordId
      const scannedItems = storedItems.filter(
        (item) => item.holdingsRecordId === holdingsRecordId
      ).length;

      // Prepare the new holdingSummaryRow
      const holdingSummaryRow: HoldingSummary = {
        hid: holdingsRecordId,
        title: response.data.items[0].title,
        author: response.data.items[0].contributorNames[0].name,
        totalItems,
        scannedItems,
        cleared: false,
        status: totalItems === scannedItems ? "All Discarded" : "Not Cleared",
      };

      // Check if there's already a row with the same hid in the holdingSummary
      const existingSummary = holdingSummary.find(
        (summary) => summary.hid === holdingsRecordId
      );

      let updatedSummary: HoldingSummary[];
      if (existingSummary) {
        // Update the existing row
        updatedSummary = holdingSummary.map((summary) =>
          summary.hid === holdingsRecordId ? holdingSummaryRow : summary
        );
      } else {
        // Add the new row if it doesn't exist
        updatedSummary = [holdingSummaryRow, ...holdingSummary];
      }

      // Update the state and save to localStorage
      setHoldingSummary(updatedSummary);
      localStorage.setItem("holdingSummary", JSON.stringify(updatedSummary));
    } catch (error) {
      setError("Error fetching holding details.");
    }
  };

  // Use effect to scroll the highlighted row into view
  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedItem]); // Trigger when highlightedItem changes

  // Toggle the correct value (true/false)
  const handleToggleCorrect = (barcode: string) => {
    const updatedItems = items.map((item) =>
      item.barcode === barcode ? { ...item, correct: !item.correct } : item
    );
    setItems(updatedItems);
    localStorage.setItem("inventoryItems", JSON.stringify(updatedItems));
  };

  const handleToggleCleared = (hid: string) => {
    const updatedHoldings = holdingSummary.map((holding) =>
      holding.hid === hid
        ? {
            ...holding,
            cleared: !holding.cleared,
            status: !holding.cleared
              ? "Cleared"
              : holding.scannedItems === holding.totalItems
              ? "All Discarded"
              : "Not Cleared",
          }
        : holding
    );
    setHoldingSummary(updatedHoldings);
    localStorage.setItem("holdingSummary", JSON.stringify(updatedHoldings));
  };

  const handleDelete = (barcode: string, holdingsRecordId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete the item?"
    );
    if (confirmed) {
      const updatedItems = items.filter((item) => item.barcode !== barcode);
      setItems(updatedItems);

      const storedHolding: HoldingSummary[] = JSON.parse(
        localStorage.getItem("holdingSummary") || "[]"
      );
      const currentHolding = storedHolding.filter(
        (holding) => (holding.hid = holdingsRecordId)
      )[0];
      const totalItems = currentHolding.totalItems;
      const scannedItems = updatedItems.filter(
        (item) => item.holdingsRecordId === holdingsRecordId
      ).length;

      // Prepare the new holdingSummaryRow
      const holdingSummaryRow: HoldingSummary = {
        hid: holdingsRecordId,
        title: currentHolding.title,
        author: currentHolding.author,
        totalItems,
        scannedItems,
        cleared: currentHolding.cleared,
        status: totalItems === scannedItems ? "All Discarded" : "Not Cleared",
      };

      // Check if there's already a row with the same hid in the holdingSummary
      const existingSummary = holdingSummary.find(
        (summary) => summary.hid === holdingsRecordId
      );

      let updatedSummary: HoldingSummary[];
      if (existingSummary) {
        // Update the existing row
        updatedSummary = holdingSummary.map((summary) =>
          summary.hid === holdingsRecordId ? holdingSummaryRow : summary
        );
      } else {
        // Add the new row if it doesn't exist
        updatedSummary = [holdingSummaryRow, ...holdingSummary];
      }

      // Update the state and save to localStorage
      updatedSummary = updatedSummary.filter(
        (holding) => holding.scannedItems > 0
      );
      setHoldingSummary(updatedSummary);
      localStorage.setItem("holdingSummary", JSON.stringify(updatedSummary));
      localStorage.setItem("inventoryItems", JSON.stringify(updatedItems));
    }
  };

  const handleClearTable = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear the entire table?"
    );
    if (confirmed) {
      setItems([]);
      setHoldingSummary([]);
      localStorage.removeItem("inventoryItems");
      localStorage.removeItem("holdingSummary");
    }
  };

  const handleDownloadItems = () => {
    const dataToExport = holdingSummary.map((holding) => ({
      HoldingID: holding.hid,
      title: holding.title,
      totalItems: holding.totalItems,
      scannedItems: holding.scannedItems,
      status: holding.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(blob, "Inventory_" + new Date().toISOString() + ".xlsx");
  };

  const handleDownloadSummery = () => {
    const dataToExport = items.map((item) => ({
      barcode: item.barcode,
      hrid: item.hrid,
      title: item.title,
      status: item.status,
      correct: item.correct ? "true" : "false", // Export correct as string true/false
      addedDateTime: item.addedDateTime,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(blob, "HoldingsSummary_" + new Date().toISOString() + ".xlsx");
  };

  useEffect(() => {
    // Load items from localStorage on component mount
    const storedItems: Item[] = JSON.parse(
      localStorage.getItem("inventoryItems") || "[]"
    );
    setItems(storedItems);

    const storedHoldings: HoldingSummary[] = JSON.parse(
      localStorage.getItem("holdingSummary") || "[]"
    );
    setHoldingSummary(storedHoldings);
  }, []);

  return (
    <div className="App">
      {/* <h4>Inventory Search</h4> */}
      {isLoading && <LoadingOverlay />}
      <button
        className="btn btn-warning"
        onClick={() => {
          setQuery("");
          setError("");
        }}
      >
        Clear Barcode
      </button>
      <input
        type="text"
        placeholder="Scan barcode"
        value={query}
        onChange={handleInputChange}
      />
      {items.length > 0 && (
        <>
          <button
            className="btn btn-info"
            onClick={() => handleDownloadItems()}
          >
            Export Items
          </button>
          <button
            className="btn btn-info"
            onClick={() => handleDownloadSummery()}
          >
            Export Holdings
          </button>
        </>
      )}
      <button className="btn btn-danger" onClick={handleClearTable}>
        Clear Table
      </button>
      {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
      <br />
      <div className="row">
        <div className="col-sm-6">
          <h5>Scanned Items List</h5>

          <div className="table-container" ref={tableContainerRef}>
            <table className="fixed-header-table" border={1}>
              <thead>
                <tr>
                  <th>Barcode</th>
                  {/* <th>HRID</th> */}
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Correct</th> {/* New Correct column */}
                  {/* <th>Date Time Added</th> */}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 && (
                  <>
                    {items.map((item, index) => (
                      <tr
                        key={index}
                        ref={
                          highlightedItem === item.barcode
                            ? highlightedRef
                            : null
                        } // Set the ref to the highlighted row
                        className={
                          highlightedItem === item.barcode
                            ? "highlighted"
                            : item.permanentLocationId ===
                              "f9f650d1-3fb9-4d15-9fd3-327893d11056"
                            ? "highlight-light-brown"
                            : item.permanentLocationId !==
                              "4536fdc7-b00a-4cd4-a375-a14f2702fea0"
                            ? "highlight-light-red"
                            : ""
                        }
                      >
                        <td>{item.barcode}</td>
                        {/* <td>{item.hrid}</td> */}
                        <td>{item.title}</td>
                        <td>{item.author}</td>
                        <td>{item.status}</td>
                        <td>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={item.correct}
                              onChange={() => handleToggleCorrect(item.barcode)}
                            />
                            <span className="slider round">
                              {item.correct ? "" : ""}
                            </span>
                          </label>
                        </td>
                        {/* <td>{item.addedDateTime}</td> */}
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() =>
                              handleDelete(item.barcode, item.holdingsRecordId)
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <br />
          <span className="wht">White row: Correct location</span>
          <span className="brn">Brown row: Discard location</span>
          <span className="red">Red row: Not Store location</span>
        </div>
        <div className="col-sm-6">
          <h5>Holdings Summary</h5>
          <div className="table-container" ref={tableContainerRef}>
            <table className="fixed-header-table" border={1}>
              <thead>
                <tr>
                  {/* <th>HRID</th> */}
                  <th>Title</th>
                  <th>Author</th>
                  <th>#Items</th>
                  <th>Scanned</th> {/* New Correct column */}
                  <th>Cleared</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {holdingSummary.map((holding, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor:
                        holding.status === "Cleared"
                          ? "lightgreen"
                          : holding.status === "All Discarded"
                          ? "#ffbbbb"
                          : "lightyellow",
                    }}
                  >
                    {/* <td>{holding.hrid}</td> */}
                    <td>{holding.title}</td>
                    <td>{holding.author}</td>
                    <td>{holding.totalItems}</td>
                    <td>{holding.scannedItems}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={holding.cleared}
                          onChange={() => handleToggleCleared(holding.hid)}
                        />
                        <span className="slider round">
                          {holding.cleared ? "" : ""}
                        </span>
                      </label>
                    </td>
                    <td>{holding.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
