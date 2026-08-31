import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export const uploadCode = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const response = await API.post(
        "/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

/*
 * Legacy direct Python upload service.
 * The dashboard now uses services/scan.js and the authenticated
 * Node endpoint: POST /api/v1/scans/paste.
 */

export {};