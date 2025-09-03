import { format } from "date-fns";
import { id } from "date-fns/locale";

export const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMM yyyy", { locale: id });
  } catch (error) {
    return "-";
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: id });
  } catch (error) {
    return "-";
  }
};