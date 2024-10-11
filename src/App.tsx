// App.tsx
import React, { useState } from "react";
import GlobalUpdate from "./GlobalUpdate";
import InventoryList from "./InventoryList";
import BusesList from "./BusesList";
import "./InventoryList.css";

const App: React.FC = () => {
  const [showGlobalUpdate, setShowGlobalUpdate] = useState(false);
  const [showInventoryList, setShowInventoryList] = useState(false);
  const [showBusesList, setShowBusesList] = useState(false);

  return (
    <div
      className="container themed-container"
      style={{ maxWidth: "90%", marginTop: "1.0rem" }}
    >
      <span
        style={{ fontWeight: "500", fontSize: "28px", marginRight: "20px" }}
      >
        DCT Medad ILS Tools
      </span>
      <button
        onClick={() => {
          if (!showGlobalUpdate) {
            setShowInventoryList(false); // If inventory list is shown, hide it
            setShowBusesList(false);
          }
          setShowGlobalUpdate(!showGlobalUpdate);
        }}
        className={
          showGlobalUpdate ? "btn btn-dark mt-2" : "btn btn-outline-dark mt-2"
        }
      >
        Global Update
      </button>
      <button
        onClick={() => {
          if (!showInventoryList) {
            setShowGlobalUpdate(false); // If GlobalUpdate is shown, hide it
            setShowBusesList(false);
          }
          setShowInventoryList(!showInventoryList);
        }}
        className={
          showInventoryList ? "btn btn-dark mt-2" : "btn btn-outline-dark mt-2"
        }
      >
        Inventory Phase.1
      </button>

      <button
        onClick={() => {
          if (!showBusesList) {
            setShowGlobalUpdate(false); // If GlobalUpdate is shown, hide it
            setShowInventoryList(false);
          }
          setShowBusesList(!showBusesList);
        }}
        className={
          showBusesList ? "btn btn-dark mt-2" : "btn btn-outline-dark mt-2"
        }
      >
        Buses List
      </button>

      {showGlobalUpdate && <GlobalUpdate />}
      {showInventoryList && <InventoryList />}
      {showBusesList && <BusesList />}
      <footer
        className="d-flex flex-wrap justify-content-between align-items-center border-top"
        style={{ paddingBottom: "0.8rem" }}
      >
        <p className="col-md-4 mb-0 text-body-secondary">© 2024 Yazeed Kloub</p>
        <a
          href="/"
          className="col-md-4 d-flex align-items-center justify-content-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"
        ></a>
      </footer>
    </div>
  );
};

export default App;
