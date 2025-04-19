import {
	Alert,
	Button,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import React, { useEffect, useState } from "react";
import ScreenWrapper from "../../components/ScreenWrapper";
import Loading from "../../components/Loading";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { hp, wp } from "../../helpers/common";
import { theme } from "../../constants/theme";
import Icon from "../../assets/icons";
import { useRouter } from "expo-router";
import Avatar from "../../components/Avatar";
import { fetchPostDetails, fetchPosts } from "../../services/postService";
import PostCard from "../../components/PostCard";
import { getUserData } from "../../services/userService";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

var limit = 0;
const Home = () => {
	const { user, setAuth, setUserData } = useAuth();
	const router = useRouter();

	const [posts, setPosts] = useState([]);
	const [hasMore, setHasMore] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [prevOffsetY, setPrevOffsetY] = useState(0); // Track the previous scroll position
	const [notificationCount, setNotificationCount] = useState(0);

	const handlePostEvent = async (payload) => {
		if (payload.eventType == "INSERT" && payload?.new?.id) {
			let newPost = { ...payload.new };
			let res = await getUserData(newPost.userId); //vamos buscar os dados do utilizador que publicou o post (FK userId)
			newPost.postLikes = [];
			newPost.comments = [{ count: 0 }];
			newPost.user = res.success ? res.data : {}; //Se correr tudo bem adicionamos um campo user ao post com os dados do utilizador.
			setPosts((prevPosts) => [newPost, ...prevPosts]);
		}
		if (payload.eventType == "DELETE" && payload.old.id) {
			setPosts((prevPosts) => {
				let updatedPosts = prevPosts.filter(
					(post) => post.id != payload.old.id
				);
				return updatedPosts;
			});
		}
		if (payload.eventType == "UPDATE" && payload?.new?.id) {
			setPosts((prevPosts) => {
				let updatedPosts = prevPosts.map((post) => {
					if (post.id == payload.new.id) {
						post.body = payload.new.body;
						post.file = payload.new.file;
					}
					return post;
				});

				return updatedPosts;
			});
		}
	};

	const handleNewNotification = async (payload) => {
		if (payload.eventType == "INSERT" && payload.new.id) {
			setNotificationCount((prev) => prev + 1);
		}
	};

	const handleNewComment = async (payload)=>{
		console.log("got new comment: ", payload.new);
		
			setPosts((post) => {
				return{
					...post,
					posts: [post, ...posts],
				};
			});
			limit = limit - 4;
			
		
	}

	useEffect(() => {
		let postChannel = supabase
			.channel("posts") //Criamos uma nova thread chamada posts
			.on(
				"postgres_changes", //evento que acontece sempre que há alguma mudança
				{ event: "*", schema: "public", table: "posts" }, //especificamos os eventos que queremos dar "listen", neste caso todos na tabela posts
				handlePostEvent //executa quando há uma mudança na tabela
			)
			.subscribe(); //muito parecido com RxJava, vamos subscrever para ficar a espera de mudanças

		let notificationChannel = supabase
			.channel("notifications")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "notifications",
					filter: `receiverId=eq.${user.id}`,
				},
				handleNewNotification
			)
			.subscribe();

			let commentChannel = supabase
				.channel("commentsHome")
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "comments",
					},
					handleNewComment
				)
				.subscribe();

		return () => {
			supabase.removeChannel(postChannel); //Quando saimos desta screen, removes o channel para prevenir potenciais erros
			supabase.removeChannel(notificationChannel);
			supabase.removeChannel(commentChannel);
		};
	}, []);

	const getPostsOnRefresh = async () => {
		let res = await fetchPosts(posts.length);

		if (res.success) {
			setHasMore(true);
			setPosts(res.data);
		}
	};

	const getPosts = async () => {
		if (!hasMore) return null;
		limit = limit + 4; //Aumentamos o limite para podermos ir buscar sempre 10 posts mais recentes em conjunto com os anteriores.

		console.log("fetching post: ", limit);
		let res = await fetchPosts(limit);
		if (res.success) {
			if (posts.length == res.data.length) setHasMore(false);
			setPosts(res.data);
		}
	};

	const onScrollHandler = (event) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		const isScrollingUp = offsetY < prevOffsetY; //No inicio vai ser 0, logo o valor vai ser falso
		// se a posicao atual é menor que a anterior quer dizer que estou a subir

		setPrevOffsetY(offsetY); //Meto a posicao anterior com o valor da atual (porque vou continuar a mexer por isso vai haver uma nova posiçao mais recente)

		// Se o utilizador tiver no topo e der scroll para cima (ou para baixo sei la faz me sempre confusao) atualiza a pagina
		if (offsetY <= 10 && isScrollingUp) {
			onRefresh(); // Fetch new posts if near the top
		}
	};

	const onRefresh = async () => {
		setRefreshing(true); // Show the refreshing indicator
		await getPostsOnRefresh(); // Fetch the latest posts
		setRefreshing(false); // Hide the refreshing indicator
	};

	return (
		<ScreenWrapper bg="white">
			<View style={styles.container}>
				{/*header*/}
				<View style={styles.header}>
					<Text style={styles.title}>SupaSocial</Text>
					<View style={styles.icons}>
						<Pressable
							onPress={() => {
								setNotificationCount(0);
								router.push("notifications");
							}}
						>
							<Icon
								name="heart"
								size={hp(3.2)}
								strokeWidth={2}
								color={theme.colors.text}
							/>
							{notificationCount > 0 && (
								<View style={styles.pill}>
									<Text style={styles.pillText}>{notificationCount}</Text>
								</View>
							)}
						</Pressable>
						<Pressable onPress={() => router.push("newPost")}>
							<Icon
								name="plus"
								size={hp(3.2)}
								strokeWidth={2}
								color={theme.colors.text}
							/>
						</Pressable>
						<Pressable onPress={() => router.push("profile")}>
							<Avatar
								uri={user?.image}
								size={hp(4.3)}
								rounded={theme.radius.sm}
								style={{ borderWidth: 2 }}
							/>
						</Pressable>
					</View>
				</View>

				{refreshing && <Loading />}

				{/*posts */}
				<FlatList
					data={posts}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listStyle}
					keyExtractor={(item) => item.id.toString()}
					renderItem={(
						{ item } //O item aqui representa um post individual do array de posts
					) => <PostCard item={item} currentUser={user} router={router} />}
					onEndReached={() => {
						getPosts();
						console.log("got to the end");
					}}
					onScroll={onScrollHandler}
					ListFooterComponent={
						hasMore ? (
							<View style={{ marginVertical: posts.length == 0 ? 200 : 30 }}>
								<Loading />
							</View>
						) : (
							<View style={{ marginVertical: 30 }}>
								<Text style={styles.noPosts}>No more posts</Text>
							</View>
						)
					}
				/>
			</View>
			{/* <Button title="logout" onPress={onLogout} /> */}
		</ScreenWrapper>
	);
};

export default Home;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
		marginHorizontal: wp(4),
	},
	title: {
		color: theme.colors.text,
		fontSize: hp(3.2),
		fontWeight: theme.fonts.bold,
	},
	icons: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 18,
	},
	listStyle: {
		paddingTop: 20,
		paddingHorizontal: wp(4),
	},
	noPosts: {
		fontSize: hp(2),
		textAlign: "center",
		color: theme.colors.text,
	},
	pill: {
		position: "absolute",
		right: -10,
		top: -4,
		height: hp(2.2),
		width: hp(2.2),
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 20,
		backgroundColor: theme.colors.roseLight,
	},
	pillText: {
		color: "white",
		fontSize: hp(1.2),
		fontWeight: theme.fonts.bold,
	},
});
