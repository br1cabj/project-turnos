import React from "react";
import { Card, Image } from "react-bootstrap";
import { Pencil } from "react-bootstrap-icons";

export default function IdentityCard({ tenant, onUpload, processing }) {
  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body className="p-4 d-flex align-items-center flex-column flex-md-row gap-4">
        <div className="position-relative">
          <div className="rounded-circle border d-flex align-items-center justify-content-center bg-light overflow-hidden" style={{ width: 100, height: 100 }}>
            {tenant?.logoUrl ? <Image src={tenant.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="fs-1">📷</span>}
          </div>
          <div className="position-absolute bottom-0 end-0">
            <label className="btn btn-sm btn-primary rounded-circle shadow-sm cursor-pointer">
              <Pencil size={12} />
              <input type="file" accept="image/*" className="d-none" onChange={e => onUpload(e.target.files[0])} disabled={processing} />
            </label>
          </div>
        </div>
        <div>
          <h4 className="fw-bold text-dark">{tenant?.name || "Mi Negocio"}</h4>
          <p className="text-muted small mb-0">Este logo aparecerá en tu página de reservas pública.</p>
        </div>
      </Card.Body>
    </Card>
  );
}