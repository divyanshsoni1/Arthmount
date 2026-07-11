import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient({
    defaultOptions: {
        mutations: {
            retry: 0,
            networkMode: "online"
        },
        queries: {
            retry: 1,
            staleTime: Infinity
        }
    }
});

export const apiClient = axios.create({
    baseURL:"/api", 
})
