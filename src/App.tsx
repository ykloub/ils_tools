import React, { useState } from "react";
import LoadingOverlay from "./LoadingOverlay";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App: React.FC = () => {
  const [value, setValue] = useState<string>("");
  const [valueCallNumber, setValueCallNumber] = useState<string>("");
  const [valueSuffixCallNumber, setValueSuffixCallNumber] =
    useState<string>("");
  const [instanceData, setInstanceData] = useState<any[]>([]);
  const [itemData, setItemData] = useState<any[]>([]);
  const [holdingData, setHoldingData] = useState<any[]>([]);
  const [holdingDetails, setHoldingDetails] = useState<any[]>([]);
  const [itemDetails, setItemDetails] = useState<any[]>([]);
  const [error, setError] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    "x-okapi-tenant": "dct",
    "x-okapi-token":
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsaWJfYWRtaW4iLCJ0eXBlIjoibGVnYWN5LWFjY2VzcyIsInVzZXJfaWQiOiI1MjI4YTQ0YS03MDc0LTRiYmQtOWM4Mi0zMzIwMjc2NTU1M2QiLCJpYXQiOjE3MTYyNzYzNDMsInRlbmFudCI6ImRjdCJ9.paaY-LtoZ_t5e1WipRIfclOtn9PmPybGium5x7JLZtg",
  };

  const handleCheck = async () => {
    setIsLoading(true);
    await fetch(
      `https://okapi-uae.ils.medad.com/search/instances?expandAll=true&limit=30&query=(holdings.hrid=="${value}")`,
      { headers }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        const instance = data.instances
          .map((instance: any) => {
            return { title: instance.indexTitle };
          })
          .flat();
        const items = data.instances
          .map((instance: any) => {
            const { items } = instance;
            return items.map((item: any) => ({
              id: item.id,
              hrid: item.hrid,
              barcode: item.barcode,
              callNumber:
                item.effectiveCallNumberComponents?.callNumber || "N/A",
              suffix: item.effectiveCallNumberComponents?.suffix || "N/A",
            }));
          })
          .flat();
        const holdings = data.instances
          .map((instance: any) => {
            const { holdings } = instance;
            return holdings.map((holding: any) => ({
              id: holding.id,
              hrid: holding.hrid,
            }));
          })
          .flat();
        setInstanceData(instance);
        setItemDetails([]);
        setItemData(items);
        items.map((item: any) => {
          handleItemsDetails(item.id);
        });
        setHoldingDetails([]);
        setHoldingData(holdings);
        holdings.map((hold: any) => {
          handleHoldingDetails(hold.id);
        });
        //setError([]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError((prevErrors) => [...prevErrors, error.message]);
      });
    setIsLoading(false);
  };
  const handleHoldingDetails = async (id: string) => {
    setIsLoading(true);
    await fetch(
      `https://okapi-uae.ils.medad.com/holdings-storage/holdings/${id}`,
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
        setHoldingDetails((prevRecords) => [...prevRecords, holdingsRecords]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError((prevErrors) => [...prevErrors, error.message]);
      });
    setIsLoading(false);
  };
  const handleItemsDetails = async (id: string) => {
    setIsLoading(true);
    await fetch(`https://okapi-uae.ils.medad.com/inventory/items/${id}`, {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        const itemsRecords = data;
        setItemDetails((prevRecords) => [...prevRecords, itemsRecords]);
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
        `https://okapi-uae.ils.medad.com/inventory/items/${id}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const itemsRecords = await response.json();
      setItemDetails((prevRecords) => [...prevRecords, itemsRecords]);
      console.log("Update Items");

      // Update the item
      itemsRecords.callNumber = valueCallNumber;
      itemsRecords.itemLevelCallNumber = valueCallNumber;
      itemsRecords.itemLevelCallNumberSuffix = valueSuffixCallNumber;
      itemsRecords.effectiveCallNumberComponents.callNumber = valueCallNumber;
      itemsRecords.effectiveCallNumberComponents.suffix = valueSuffixCallNumber;

      const updateResponse = await fetch(
        `https://okapi-uae.ils.medad.com/inventory/items/${itemsRecords.id}`,
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
          holding.callNumber = valueCallNumber;
          holding.callNumberSuffix = valueSuffixCallNumber;
          const response = await fetch(
            `https://okapi-uae.ils.medad.com/holdings-storage/holdings/${holding.id}`,
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

    //Get Items full record & Update ITems
    console.log("Get Items");
    try {
      setItemDetails([]);
      await Promise.all(
        itemData.map((item: any) => {
          handleItemsUpdate(item.id);
        })
      );
    } catch (error) {}
    setIsLoading(false);
  };

  return (
    <div className="container mt-4">
      {isLoading && <LoadingOverlay />}
      <div className="row">
        <div className="mb-3">
          <div className="col-sm-4">
            <label htmlFor="holdingHRID" className="form-label mb-2">
              Enter Holding HRID XXX
            </label>
            <input
              className="form-control"
              id="holdingHRID"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="col-sm-4">
            <button className="btn btn-primary mt-2" onClick={handleCheck}>
              Check
            </button>
          </div>
        </div>

        {instanceData.length > 0 && (
          <div className="col-sm-3">
            <h5>Title: </h5>
            <p>{instanceData.map((instance) => instance.title)}</p>
          </div>
        )}
        {holdingDetails.length > 0 && (
          <div className="col-sm-4">
            <h5>Holdings Details:</h5>
            <div className="row">
              <div className="col-sm-1">
                <strong>#</strong>
              </div>
              <div className="col-sm-4">
                <strong>HRID</strong>
              </div>
              <div className="col-sm-5">
                <strong>Call Number</strong>
              </div>
              <div className="col-sm-2">
                <strong>Suffix</strong>
              </div>
              {holdingDetails.map((holding, index) => (
                <>
                  <div className="col-sm-1">{index + 1}</div>
                  <div className="col-sm-4">{holding.hrid}</div>
                  <div className="col-sm-5">{holding.callNumber}</div>
                  <div className="col-sm-2">{holding.callNumberSuffix}</div>
                </>
              ))}
            </div>
          </div>
        )}
        {itemData.length > 0 && (
          <div className="col-sm-5">
            <h5>Items:</h5>
            <div className="row">
              <div className="col-sm-1">
                <strong>#</strong>
              </div>
              <div className="col-sm-3">
                <strong>HRID</strong>
              </div>
              <div className="col-sm-2">
                <strong>Barcode</strong>
              </div>
              <div className="col-sm-4">
                <strong>Call Number</strong>
              </div>
              <div className="col-sm-2">
                <strong>Suffix</strong>
              </div>
              {itemDetails.map((item, index) => (
                <>
                  <div className="col-sm-1">{index + 1}</div>
                  <div className="col-sm-3">{item.hrid}</div>
                  <div className="col-sm-2">{item.barcode}</div>
                  <div className="col-sm-4">{item.itemLevelCallNumber}</div>
                  <div className="col-sm-2">
                    {item.itemLevelCallNumberSuffix}
                  </div>
                </>
              ))}
            </div>
          </div>
        )}
        <div className="col-sm-12">&nbsp;</div>
        <div className="col-sm-4">
          {holdingDetails.length > 0 && (
            <div className="row">
              <div className="col-sm-12">
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
              <div className="col-sm-12">
                <label
                  htmlFor="newCallNumberSuffix"
                  className="form-label mb-2"
                >
                  Enter New Call Number Suffix
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="newCallNumberSuffix"
                  value={valueSuffixCallNumber}
                  onChange={(e) => setValueSuffixCallNumber(e.target.value)}
                />
              </div>
              <div className="col-sm-12">
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
      </div>
    </div>
  );
};

export default App;
