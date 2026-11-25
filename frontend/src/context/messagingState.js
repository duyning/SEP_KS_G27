import {createContext,useContext} from 'react';

export const MessagingContext=createContext(null);
export const useMessaging=()=>useContext(MessagingContext);
