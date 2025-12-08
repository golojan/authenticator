import axios from "axios";
import { authConfig } from "../env";

if (!authConfig || !authConfig.API_URL) {
    throw new Error("API_URL is not defined in authConfig");
}

const axiosInstance = axios.create({
    baseURL: authConfig.API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

export default axiosInstance;