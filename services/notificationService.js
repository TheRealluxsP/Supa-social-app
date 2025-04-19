import { supabase } from "../lib/supabase";

export const createNotification = async (notification) => {
	try {
		const { data, error } = await supabase
			.from("notifications")
			.insert(notification)
			.select()
			.single();

		if (error) {
			console.log("notification error: ", error);
			return { success: false, msg: "Something went wrong!" };
		}

		return { success: true, data: data };
	} catch (error) {
		console.log("notification error: ", error);
		return { success: false, msg: "Something went wrong!" };
	}
};

export const fetchNotifications = async (receiverId) => {
	try {
		const { data, error } = await supabase
			.from("notifications")
			.select(
				`
            *,
            sender: senderId(id, name, image)

        `
			)
			.eq("receiverId", receiverId)
			.order("created_at", { ascending: false });

		if (error) {
			console.log("fetchNotifications error: ", error);
			return { success: false, msg: "Could not fetch notifications" };
		}

		return { success: true, data: data };
	} catch (error) {
		console.log("fetchNotifications error: ", error);
		return { success: false, msg: "Could not fetch notifications" };
	}
};

export const deleteNotification = async (notificationId) => {
	try {
		const { error } = await supabase
			.from("notifications")
			.delete()
			.eq("id", notificationId);

		if (error) {
			console.log("deleteNotif error: ", error);
		}

		return { success: true };
	} catch (error) {
		console.log("deleteNotif error: ", error);
		return { succcess: false, msg: "Could not remove the post" };
	}
};
