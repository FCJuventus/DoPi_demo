import React from "react";

type Props = {
  title: string;
  description: string;
  budgetPi: number;
  status: string;
  onOpen?: ()=>void;
};

export default function JobCard({title, description, budgetPi, status, onOpen}: Props){
  return (
    <div className="card">
      <div className="h2" style={{marginBottom:6}}>{title}</div>
      <div className="muted" style={{marginBottom:10}}>{description}</div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8}}>
        <div className="muted">Status: <b>{status}</b></div>
        <div style={{fontWeight:700}}>⧫ {budgetPi} Test-Pi</div>
      </div>
      {onOpen && <div style={{marginTop:12}}><button className="btn" onClick={onOpen}>Открыть</button></div>}
    </div>
  );
}
