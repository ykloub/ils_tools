import React, { useState, useEffect } from "react";
import LoadingOverlay from "./LoadingOverlay";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App: React.FC = () => {
  interface Note {
    itemNoteTypeId: string;
    note: string;
    staffOnly: boolean;
  }

  interface itemLocation {
    id: string;
    name: string;
  }

  interface effCallNumComp {
    callNumber: string;
    suffix: string;
  }

  interface Item {
    id: string;
    hrid: string;
    barcode: string;
    callNumber: string;
    effectiveCallNumberComponents: effCallNumComp;
    itemLevelCallNumber: string;
    itemLevelCallNumberSuffix: string;
    notes: Note[];
    holdingsRecordId: string;
    permanentLocation: itemLocation;
    effectiveLocation: itemLocation;
  }

  interface NoteList {
    itemId: string;
    noteTypeId: string;
    note: string;
  }
  const [value, setValue] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [valueCallNumber, setValueCallNumber] = useState<string>("");
  const [valueSuffixCallNumber, setValueSuffixCallNumber] =
    useState<string>("");
  const [valueNotes, setValueNotes] = useState<NoteList[]>([]);
  const [instanceData, setInstanceData] = useState<any[]>([]);
  const [itemData, setItemData] = useState<any[]>([]);
  const [holdingData, setHoldingData] = useState<any[]>([]);
  const [holdingDetails, setHoldingDetails] = useState<any[]>([]);
  const [itemDetails, setItemDetails] = useState<Item[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [error, setError] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    "x-okapi-tenant": "dctuae",
    "x-okapi-token": token,
  };

  const handleCheck = async () => {
    setIsLoading(true);
    fetchLocations();

    setValueCallNumber("");
    setValueSuffixCallNumber("");
    setValueNotes([]);
    setInstanceData([]);
    setItemData([]);
    setHoldingData([]);
    setHoldingDetails([]);
    setItemDetails([]);
    setLocations([]);
    setError([]);
    setMessage("");

    await fetch(
      `https://okapi-uae-cls01.ils.medad.com/search/instances?expandAll=true&limit=30&query=(hrid=="${value}")`,
      { headers }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.totalRecords === 0) {
          setMessage("Instance not found");
        }
        const instance = data.instances
          .map((instance: any) => {
            return { title: instance.indexTitle };
          })
          .flat();

        // Preparing Items data
        const items = data.instances
          .map(
            (instance: any) =>
              instance.items?.map((item: any) => ({
                id: item.id,
                hrid: item.hrid,
                barcode: item.barcode,
                callNumber:
                  item.effectiveCallNumberComponents?.callNumber || "N/A",
                suffix: item.effectiveCallNumberComponents?.suffix || "N/A",
              })) || []
          )
          .flat()
          .sort((a: any, b: any) => a.hrid.localeCompare(b.hrid)); // Sorting items by hrid

        // Preparing Holdings data
        const holdings = data.instances
          .map(
            (instance: any) =>
              instance.holdings?.map((holding: any) => ({
                id: holding.id,
                hrid: holding.hrid,
              })) || []
          )
          .flat()
          .sort((a: any, b: any) => a.hrid.localeCompare(b.hrid)); // Sorting holdings by hrid

        // Updating state with sorted data
        setInstanceData(instance);
        setItemDetails([]);
        setItemData(items);
        items.forEach((item: any) => handleItemsDetails(item.id));

        setHoldingDetails([]);
        setHoldingData(holdings);
        holdings.forEach((holding: any) => handleHoldingDetails(holding.id));

        setError([]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError((prevErrors) => [...prevErrors, error.message]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleHoldingDetails = async (id: string) => {
    setIsLoading(true);
    await fetch(
      `https://okapi-uae-cls01.ils.medad.com/holdings-storage/holdings/${id}`,
      {
        headers,
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        const holdingsRecords = data;
        if (value === holdingsRecords.hrid) {
          setValueCallNumber(holdingsRecords.callNumber);
          setValueSuffixCallNumber(holdingsRecords.callNumberSuffix);
        }
        // setHoldingDetails((prevRecords) => [...prevRecords, holdingsRecords]);
        setHoldingDetails((prevRecords) => {
          const updatedRecords = [...prevRecords, holdingsRecords];
          return updatedRecords.sort((a, b) => a.hrid.localeCompare(b.hrid));
        });
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError((prevErrors) => [...prevErrors, error.message]);
      });
    setIsLoading(false);
  };
  const handleItemsDetails = async (id: string) => {
    setIsLoading(true);
    await fetch(`https://okapi-uae-cls01.ils.medad.com/inventory/items/${id}`, {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        const itemsRecords: Item = data;
        // setItemDetails((prevRecords) => [...prevRecords, itemsRecords]);
        setItemDetails((prevRecords) => {
          const updatedRecords = [...prevRecords, itemsRecords];
          return updatedRecords.sort((a, b) => a.hrid.localeCompare(b.hrid));
        });
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError((prevErrors) => [...prevErrors, error.message]);
      });
    setIsLoading(false);
  };
  const handleItemsUpdate = async (id: string) => {
    try {
      setIsLoading(true);
      // Fetch item details
      const response = await fetch(
        `https://okapi-uae-cls01.ils.medad.com/inventory/items/${id}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const itemsRecords: Item = await response.json();
      setItemDetails((prevRecords) => [...prevRecords, itemsRecords]);

      // Update the item
      if (valueCallNumber !== "") {
        itemsRecords.callNumber = valueCallNumber;
        itemsRecords.itemLevelCallNumber = valueCallNumber;
        itemsRecords.effectiveCallNumberComponents.callNumber = valueCallNumber;
      }
      if (valueSuffixCallNumber !== "Empty") {
        itemsRecords.itemLevelCallNumberSuffix = valueSuffixCallNumber;
        itemsRecords.effectiveCallNumberComponents.suffix =
          valueSuffixCallNumber;
      }
      holdingData.map((holding: any) => {
        if (holding.id === itemsRecords.holdingsRecordId) {
          locations.map((location: any) => {
            if (location.id === holding.permanentLocationId) {
              itemsRecords.permanentLocation = {
                id: location.id,
                name: location.name,
              };
              itemsRecords.effectiveLocation = {
                id: location.id,
                name: location.name,
              };
            }
          });
        }
      });

      const typeId = "61686260-79bd-482e-9481-e34bdf07dbc9";
      const relevantNotes = itemsRecords.notes.filter(
        (note) => note.itemNoteTypeId === typeId
      );
      if (relevantNotes.length === 0) {
        // addMissingNote(itemsRecords.id, typeId);
        itemsRecords.notes.push({
          itemNoteTypeId: typeId,
          note: "0",
          staffOnly: false,
        });
      }
      valueNotes.map((nt: NoteList) => {
        if (nt.itemId === itemsRecords.id) {
          itemsRecords.notes.map((note) => {
            if (note.itemNoteTypeId === nt.noteTypeId) {
              note.note = nt.note;
            }
          });
        }
      });

      const updateResponse = await fetch(
        `https://okapi-uae-cls01.ils.medad.com/inventory/items/${itemsRecords.id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(itemsRecords),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(
          "Failed to update the item with ID: " + itemsRecords.id
        );
      }
    } catch (error) {
      setError((prevErrors) => [...prevErrors, "Error updating Items"]);
    }
    setIsLoading(false);
  };
  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      setHoldingDetails([]);
      await Promise.all(
        holdingData.map((holding: any) => {
          handleHoldingDetails(holding.id);
        })
      );
    } catch (error) {}

    //Update Holdings
    try {
      await Promise.all(
        holdingDetails.map(async (holding) => {
          if (valueCallNumber !== "") {
            holding.callNumber = valueCallNumber;
          }
          if (valueSuffixCallNumber !== "Empty") {
            holding.callNumberSuffix = valueSuffixCallNumber;
          }
          const response = await fetch(
            `https://okapi-uae-cls01.ils.medad.com/holdings-storage/holdings/${holding.id}`,
            {
              method: "PUT",
              headers,
              body: JSON.stringify(holding),
            }
          );

          if (!response.ok) {
            throw new Error(
              "Failed to update the holding with ID: " + holding.id
            );
          }
        })
      );
    } catch (error) {
      setError((prevErrors) => [...prevErrors, "Error updating holdings"]);
    }

    try {
      setHoldingDetails([]);
      await Promise.all(
        holdingData.map((holding: any) => {
          handleHoldingDetails(holding.id);
        })
      );
    } catch (error) {}

    //Get Items full record & Update Items
    try {
      setItemDetails([]);
      await Promise.all(
        itemData.map((item: any) => {
          handleItemsUpdate(item.id);
        })
      );
      setValueNotes([]);
    } catch (error) {}
    setIsLoading(false);
  };

  useEffect(() => {
    const typeId = "61686260-79bd-482e-9481-e34bdf07dbc9";
    itemDetails.forEach((item) => {
      const relevantNotes = item.notes.filter(
        (note) => note.itemNoteTypeId === typeId
      );
      if (relevantNotes.length === 0) {
        addMissingNote(item.id, typeId);
      }
    });
  }, [itemDetails]);

  const handleNoteInputChange =
    (itemId: string, noteTypeId: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleNoteChange(itemId, noteTypeId, e.target.value);
    };

  const handleNoteChange = (
    itemId: string,
    noteTypeId: string,
    newValue: string
  ) => {
    setItemDetails((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          // Creating a new array of notes with the updated value for the specified note type
          const updatedNotes = item.notes.map((note) => {
            if (note.itemNoteTypeId === noteTypeId) {
              return { ...note, note: newValue }; // Update the note with new value
            }
            return note; // Return other notes as is
          });
          return { ...item, notes: updatedNotes }; // Return a new item object with updated notes
        }
        return item; // Return other items as is
      })
    );
    const newNote: NoteList = {
      itemId: itemId,
      noteTypeId: noteTypeId,
      note: newValue,
    };
    setValueNotes((prevNotes) => [...prevNotes, newNote]);
  };

  const addMissingNote = (itemId: string, typeId: string) => {
    setItemDetails((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const hasType = item.notes.some(
            (note) => note.itemNoteTypeId === typeId
          );
          if (!hasType) {
            item.notes.push({
              itemNoteTypeId: typeId,
              note: "0", // Default note value
              staffOnly: false, // Assuming default for new notes
            });
          }
        }
        return item;
      })
    );
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(
        "https://okapi-uae-cls01.ils.medad.com/locations?limit=5000",
        { headers }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      // Handle errors as needed
    }
  };

  return (
    <div
      className="container mt-4 themed-container"
      style={{ maxWidth: "90%" }}
    >
      <center>
        <h4>DCT Medad Global Update</h4>
        <hr />
      </center>
      {isLoading && <LoadingOverlay />}
      <div className="row alert alert-primary">
        <div className="col-sm-7">
          <label htmlFor="token" className="form-label mb-2">
            Enter Medad Token{" "}
            {/* <a
              href="https://dct.ils.medad.com/settings/developer/token"
              target="_blank"
            >
              Find here
            </a> */}
          </label>
          <input
            className="form-control"
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div className="col-sm-4">
          <label htmlFor="holdingHRID" className="form-label mb-2">
            Enter Instance HRID
          </label>
          <input
            className="form-control"
            id="holdingHRID"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div
          className="col-sm-1"
          style={{ display: "flex", alignItems: "flex-end" }}
        >
          <button
            id="checkbtn"
            className="btn btn-primary mt-2"
            onClick={handleCheck}
          >
            Check
          </button>
        </div>
      </div>
      <div className="row">
        {instanceData.length > 0 && (
          <div className="col-sm-12  alert alert-success">
            <h5>Title: </h5>
            <h6>{instanceData.map((instance, index) => instance.title)}</h6>
          </div>
        )}
        {holdingDetails.length > 0 && (
          <div className="col-sm-12 alert alert-dark">
            <div className="row ">
              <div className="col-sm-3">
                <h5>Holdings Details:</h5>
              </div>
              <div className="col-sm-9">
                <h5>Items Details:</h5>
              </div>
            </div>

            {holdingDetails.map((holding, index) => (
              <div
                className={
                  index % 2 === 0
                    ? "row alert alert-secondary"
                    : "row alert alert-light"
                }
              >
                <div className="col-sm-3">
                  <strong>Holding Record #{index + 1}</strong>
                  <div className="col-sm-12">
                    <strong>HRID: </strong>
                    {holding.hrid}
                  </div>
                  <div className="col-sm-12">
                    <strong>Call Number: </strong>
                    <span className="badge text-bg-primary ">
                      {holding.callNumber}
                    </span>
                  </div>
                  <div className="col-sm-12">
                    <strong>Suffix: </strong>
                    <span className="badge text-bg-info ">
                      {holding.callNumberSuffix}
                    </span>
                  </div>
                  <div
                    className="col-sm-12"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <strong style={{ marginRight: "10px" }}>Location: </strong>
                    <select
                      className="form-control"
                      // style={{ width: "auto", flexGrow: 1 }}
                      value={holding.permanentLocationId}
                      onChange={(e) => {
                        const updatedHoldings = holdingDetails.map((h) => {
                          if (h.id === holding.id) {
                            return {
                              ...h,
                              permanentLocationId: e.target.value,
                            };
                          }
                          return h;
                        });
                        setHoldingDetails(updatedHoldings);
                      }}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-sm-9">
                  <h6>Holding Record #{index + 1} Items List:</h6>
                  {itemData.length > 0 && (
                    <div className="col-sm-12">
                      <div className="row">
                        {(() => {
                          const filteredItems = itemDetails.filter(
                            (item) => item.holdingsRecordId === holding.id
                          );
                          if (filteredItems.length > 0) {
                            return (
                              <>
                                <div className="col-sm-1">
                                  <strong>#</strong>
                                </div>
                                <div className="col-sm-2">
                                  <strong>HRID</strong>
                                </div>
                                <div className="col-sm-1">
                                  <strong>Barcode</strong>
                                </div>
                                <div className="col-sm-3">
                                  <strong>location</strong>
                                </div>
                                <div className="col-sm-2">
                                  <strong>Call Number</strong>
                                </div>
                                <div className="col-sm-1">
                                  <strong>Suffix</strong>
                                </div>
                                <div className="col-sm-2">
                                  <strong>Price</strong>
                                </div>
                              </>
                            );
                          }
                        })()}

                        {(() => {
                          const filteredItems = itemDetails.filter(
                            (item) => item.holdingsRecordId === holding.id
                          );
                          if (filteredItems.length === 0) {
                            return (
                              <div className="col-sm-12">
                                <strong>No items found.</strong>
                              </div>
                            );
                          }
                          return filteredItems.map((item, index) => (
                            <>
                              <div className="col-sm-1">{index + 1}</div>
                              <div className="col-sm-2">{item.hrid}</div>
                              <div className="col-sm-1">{item.barcode}</div>
                              <div className="col-sm-3">
                                {item.effectiveLocation.name}
                              </div>
                              <div className="col-sm-2">
                                <span className="badge text-bg-primary ">
                                  {item.itemLevelCallNumber}
                                </span>
                              </div>
                              <div className="col-sm-1">
                                <span className="badge text-bg-info ">
                                  {" "}
                                  {item.itemLevelCallNumberSuffix}
                                </span>
                              </div>
                              <div className="col-sm-2">
                                {item.notes
                                  .filter(
                                    (note) =>
                                      note.itemNoteTypeId ===
                                      "61686260-79bd-482e-9481-e34bdf07dbc9"
                                  )
                                  .map((note, noteIndex) => (
                                    <input
                                      key={noteIndex}
                                      className="form-control"
                                      type="text"
                                      value={note.note}
                                      onChange={handleNoteInputChange(
                                        item.id,
                                        note.itemNoteTypeId
                                      )}
                                    />
                                  ))}
                              </div>
                            </>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="col-sm-12">
          {holdingDetails.length > 0 && (
            <div className="row  alert alert-info">
              <div className="col-sm-5">
                Fill to update Call Number & Call Number Suffix for all Holdings
                and Items, if kept as is Call Number will not be effected.
              </div>
              <div className="col-sm-3">
                <label htmlFor="newCallNumber" className="form-label mb-2">
                  Enter New Call Number
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="newCallNumber"
                  value={valueCallNumber}
                  onChange={(e) => setValueCallNumber(e.target.value)}
                />
              </div>
              <div className="col-sm-3">
                <label
                  htmlFor="newCallNumberSuffix"
                  className="form-label mb-2"
                >
                  Enter New Call Number Suffix
                </label>
                <select
                  className="form-control"
                  value={valueSuffixCallNumber}
                  onChange={(e) => setValueSuffixCallNumber(e.target.value)}
                >
                  <option key="0" value="Empty">
                    *Empty* for not change value
                  </option>
                  <option key="1" value="AV">
                    Audio Visual
                  </option>
                  <option key="2" value="CH">
                    Children books
                  </option>
                  <option key="3" value="GULF">
                    Gulf books
                  </option>
                  <option key="4" value="PER">
                    Periodicals
                  </option>
                  <option key="5" value="RARE">
                    Rare Books
                  </option>
                  <option key="6" value="REF">
                    Reference
                  </option>
                  <option key="7" value="RES">
                    Restricted
                  </option>
                  <option key="8" value="THESES">
                    Theses
                  </option>
                </select>
              </div>
              <div
                className="col-sm-1"
                style={{ display: "flex", alignItems: "flex-end" }}
              >
                <button className="btn btn-primary mt-2" onClick={handleUpdate}>
                  Update
                </button>
              </div>
            </div>
          )}
        </div>
        {error.length > 0 && (
          <>
            {error.map((er) => (
              <div className="col-sm-12 alert alert-danger">Error: {er}</div>
            ))}
          </>
        )}
        {message !== "" && (
          <div className="col-sm-12 alert alert-warning">{message}</div>
        )}
      </div>
      <footer className="d-flex flex-wrap justify-content-between align-items-center py-3 my-4 border-top">
        <p className="col-md-4 mb-0 text-body-secondary">© 2024 Yazeed Kloub</p>

        <a
          href="/"
          className="col-md-4 d-flex align-items-center justify-content-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"
        ></a>

        {/* <ul className="nav col-md-4 justify-content-end">
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-body-secondary">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-body-secondary">
              Features
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-body-secondary">
              Pricing
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-body-secondary">
              FAQs
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link px-2 text-body-secondary">
              About
            </a>
          </li>
        </ul> */}
      </footer>
    </div>
  );
};

export default App;
